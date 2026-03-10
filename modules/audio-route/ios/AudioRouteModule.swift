import ExpoModulesCore
import AVFoundation

public class AudioRouteModule: Module {
  // A2DP 出力専用デバイス（Bluetooth スピーカー等）のキャッシュ（#67）
  // currentRoute.outputs は現在アクティブな出力のみ返すため、
  // ルート変更時に一度見えた A2DP デバイスを記憶しておく。
  // iOS には availableOutputs API が存在しないため、この方法でしか
  // 非アクティブな A2DP デバイスを追跡できない。
  private static var knownA2DPDevices: [[String: String]] = []
  private static var routeChangeObserverRegistered = false
  // イベント送信用のモジュールインスタンス参照
  private static weak var moduleInstance: AudioRouteModule?

  /// ルート変更通知を監視し、A2DP デバイスをキャッシュに追加する
  /// またルート変更イベントを JS 層に発行する（#67）
  private static func registerRouteChangeObserverIfNeeded() {
    guard !routeChangeObserverRegistered else { return }
    routeChangeObserverRegistered = true

    NotificationCenter.default.addObserver(
      forName: AVAudioSession.routeChangeNotification,
      object: nil,
      queue: .main
    ) { notification in
      let reason = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt
      let reasonEnum = AVAudioSession.RouteChangeReason(rawValue: reason ?? 0)

      // デバイス切断時は A2DP キャッシュから該当デバイスを削除
      if reasonEnum == .oldDeviceUnavailable {
        if let previousRoute = notification.userInfo?[AVAudioSessionRouteChangePreviousRouteKey] as? AVAudioSessionRouteDescription {
          for port in previousRoute.outputs where port.portType == .bluetoothA2DP {
            Self.knownA2DPDevices.removeAll { $0["name"] == port.portName }
          }
        }
      }

      Self.updateKnownA2DPDevices()

      // JS 層にルート変更イベントを発行
      // useAudioDeviceRoute がこれを受けてデバイスリストを再取得する
      Self.moduleInstance?.sendEvent("onAudioRouteChange", [
        "reason": Self.routeChangeReasonString(reasonEnum),
      ])
    }

    // 初回登録時に現在のルートからもキャッシュ
    updateKnownA2DPDevices()
  }

  /// currentRoute.outputs から A2DP デバイスを knownA2DPDevices に追加する
  private static func updateKnownA2DPDevices() {
    let session = AVAudioSession.sharedInstance()
    for port in session.currentRoute.outputs {
      if port.portType == .bluetoothA2DP {
        let entry: [String: String] = [
          "uid": port.uid,
          "name": port.portName,
          "type": port.portType.rawValue,
        ]
        // 名前ベースで重複排除（UID はプロファイル切替で変わるため）
        if !knownA2DPDevices.contains(where: { $0["name"] == port.portName }) {
          knownA2DPDevices.append(entry)
        }
      }
    }
  }

  /// RouteChangeReason を文字列に変換
  private static func routeChangeReasonString(_ reason: AVAudioSession.RouteChangeReason?) -> String {
    switch reason {
    case .newDeviceAvailable: return "newDeviceAvailable"
    case .oldDeviceUnavailable: return "oldDeviceUnavailable"
    case .categoryChange: return "categoryChange"
    case .override: return "override"
    case .routeConfigurationChange: return "routeConfigurationChange"
    default: return "unknown"
    }
  }

  public func definition() -> ModuleDefinition {
    Name("AudioRoute")

    // モジュールインスタンスを保持（イベント送信用）
    OnCreate {
      Self.moduleInstance = self
    }

    // JS 層に発行するイベント定義（#67）
    Events("onAudioRouteChange")

    // 接続済み入力デバイス（マイク）一覧を返す
    // 開発用: 内蔵マイクは除外し外部デバイスのみ返す
    // setCategory は呼ばない（音楽再生を中断させないため）
    // A2DP 出力専用デバイスは入力リストに含めない（#63 で修正）
    // Bluetooth デバイスは TS 層で両ピッカーに統合される
    AsyncFunction("getAvailableInputs") { () -> [[String: String]] in
      let session = AVAudioSession.sharedInstance()
      var result: [[String: String]] = []

      if let inputs = session.availableInputs {
        // 開発用: 内蔵マイクを除外
        result = inputs
          .filter { $0.portType != .builtInMic }
          .map { port in
            [
              "uid": port.uid,
              "name": port.portName,
              "type": port.portType.rawValue,
            ]
          }
      }

      return result
    }

    // 利用可能な出力デバイス一覧を返す（#67 で改善）
    // 1. currentRoute.outputs から現在アクティブな外部デバイスを列挙
    // 2. availableInputs から HFP/LE 双方向デバイスを追加
    // 3. knownA2DPDevices キャッシュから A2DP 出力専用デバイスを追加
    //    → currentRoute から外れた A2DP デバイスもリストに残る
    // 4. 内蔵スピーカーは常に含める
    AsyncFunction("getAvailableOutputs") { () -> [[String: String]] in
      let session = AVAudioSession.sharedInstance()
      var outputs: [[String: String]] = []
      var seenUIDs = Set<String>()
      var seenNames = Set<String>()

      // ルート変更監視を開始（初回のみ）
      Self.registerRouteChangeObserverIfNeeded()
      // 現在のルートからも A2DP キャッシュを更新
      Self.updateKnownA2DPDevices()

      // 1. 現在アクティブな出力デバイス
      for port in session.currentRoute.outputs {
        if port.portType != .builtInSpeaker {
          outputs.append([
            "uid": port.uid,
            "name": port.portName,
            "type": port.portType.rawValue,
          ])
          seenUIDs.insert(port.uid)
          seenNames.insert(port.portName)
        }
      }

      // 2. availableInputs に含まれる Bluetooth HFP/LE デバイスは双方向なので
      //    出力としても選択可能。currentRoute に出ていないものを追加する
      if let inputs = session.availableInputs {
        let btInputTypes: [AVAudioSession.Port] = [.bluetoothHFP, .bluetoothLE]
        for port in inputs where btInputTypes.contains(port.portType) {
          if !seenUIDs.contains(port.uid) && !seenNames.contains(port.portName) {
            outputs.append([
              "uid": port.uid,
              "name": port.portName,
              "type": port.portType.rawValue,
            ])
            seenUIDs.insert(port.uid)
            seenNames.insert(port.portName)
          }
        }
      }

      // 3. knownA2DPDevices キャッシュから、まだリストに無い A2DP デバイスを追加（#67）
      //    currentRoute から外れた A2DP スピーカーもリストに残し続ける
      for device in Self.knownA2DPDevices {
        let deviceName = device["name"] ?? ""
        let deviceUID = device["uid"] ?? ""
        if !seenUIDs.contains(deviceUID) && !seenNames.contains(deviceName) {
          outputs.append(device)
          seenUIDs.insert(deviceUID)
          seenNames.insert(deviceName)
        }
      }

      // 4. 内蔵スピーカーは常に含める
      outputs.append([
        "uid": "builtin_speaker",
        "name": "内蔵スピーカー",
        "type": AVAudioSession.Port.builtInSpeaker.rawValue,
      ])

      return outputs
    }

    // 優先する入力デバイス（マイク）を設定する。nil で自動に戻す。
    // セッション変更は行わない: Bluetooth デバイスが availableInputs に含まれない場合は
    // 何もしない（音声認識の start イベントで allowBluetooth が有効な状態で再試行される）
    // uid と name の両方を受け取り、UID 不一致時は名前でフォールバック検索する（#63）
    // Bluetooth プロファイル切り替え（A2DP↔HFP）で UID が変わる問題に対応
    AsyncFunction("setPreferredInput") { (uid: String?, name: String?) throws in
      let session = AVAudioSession.sharedInstance()

      guard let uid = uid else {
        try session.setPreferredInput(nil)
        return
      }

      guard let inputs = session.availableInputs else { return }

      // 1. UID 完全一致を試行
      if let port = inputs.first(where: { $0.uid == uid }) {
        try session.setPreferredInput(port)
        return
      }

      // 2. UID 不一致の場合、デバイス名でフォールバック検索
      //    Bluetooth プロファイル切り替え（A2DP→HFP）で UID が変わるケースに対応
      if let name = name,
         let port = inputs.first(where: { $0.portName == name }) {
        try session.setPreferredInput(port)
        return
      }

      // availableInputs に見つからない場合はセッション変更せず何もしない
      // 音声認識開始時に allowBluetooth が有効になった後に再適用される
    }

    // 優先する出力デバイスを設定する。
    // "builtin_speaker" → 内蔵スピーカーを強制。
    // その他の uid → 接続中のデバイスを使用（iOS のルーティングに委ねる）。
    AsyncFunction("setPreferredOutput") { (uid: String) throws in
      let session = AVAudioSession.sharedInstance()

      if uid == "builtin_speaker" {
        try session.overrideOutputAudioPort(.speaker)
      } else {
        try session.overrideOutputAudioPort(.none)
      }
    }

    // 音声認識開始前に audio session を設定し、Bluetooth マイクを preferred input に設定する（#65）
    //
    // expo-speech-recognition の内部フロー:
    //   1. setupAudioSession() → setCategory + setActive
    //   2. AVAudioEngine() → inputNode が「この時点の」入力デバイスをキャプチャ
    //   3. audioEngine.start()
    //   4. startHandler() → ← ここで setPreferredInput しても手遅れ
    //
    // この関数を ExpoSpeechRecognitionModule.start() の前に呼ぶことで:
    //   - setCategory(.playAndRecord, allowBluetooth) が先に実行される
    //   - Bluetooth デバイスが availableInputs に出現する
    //   - setPreferredInput で Bluetooth マイクが設定される
    //   - expo-speech-recognition が同じ category を設定 → no-op（preferredInput 維持）
    //   - AVAudioEngine.inputNode が Bluetooth マイクをキャプチャする
    //
    // #67 修正: Bluetooth マイク選択時は .defaultToSpeaker を除外する。
    // HFP は入出力同期プロトコルであり、.defaultToSpeaker が出力を内蔵スピーカーに
    // 強制すると iOS が HFP 同期を維持できず setPreferredInput を無視する。
    // ref: Apple Developer Forums #713197, #730600
    //
    // 追加で expo-speech-recognition のパッチにより、ライブラリ内部でも
    // setupAudioSession() と AVAudioEngine() の間で setPreferredInput が呼ばれる。
    // この関数は事前準備として category 設定と preferredInput を先に適用しておく。
    AsyncFunction("prepareSessionForRecognition") { (uid: String?, name: String?) throws in
      let session = AVAudioSession.sharedInstance()

      // Bluetooth マイクが指定されているかチェック
      let isBluetooth = Self.isBluetoothDevice(uid: uid, name: name, session: session)

      // .defaultToSpeaker は Bluetooth HFP マイクルーティングと競合する（#67）
      var categoryOptions: AVAudioSession.CategoryOptions = [
        .allowBluetooth, .allowBluetoothA2DP, .mixWithOthers
      ]
      if !isBluetooth {
        categoryOptions.insert(.defaultToSpeaker)
      }

      try session.setCategory(
        .playAndRecord,
        mode: .default,
        options: categoryOptions
      )
      try session.setActive(true, options: .notifyOthersOnDeactivation)

      // allowBluetooth が有効な状態で setPreferredInput を実行
      guard let uid = uid else { return }
      guard let inputs = session.availableInputs else { return }

      // UID 完全一致 → 名前フォールバック（プロファイル切替で UID 変更時）
      if let port = inputs.first(where: { $0.uid == uid }) {
        try session.setPreferredInput(port)
      } else if let name = name,
                let port = inputs.first(where: { $0.portName == name }) {
        try session.setPreferredInput(port)
      }
    }

    // 現在アクティブなルート（入出力）を返す
    AsyncFunction("getCurrentRoute") { () -> [String: [[String: String]]] in
      let session = AVAudioSession.sharedInstance()
      let inputs = session.currentRoute.inputs.map { port in
        [
          "uid": port.uid,
          "name": port.portName,
          "type": port.portType.rawValue,
        ]
      }
      let outputs = session.currentRoute.outputs.map { port in
        [
          "uid": port.uid,
          "name": port.portName,
          "type": port.portType.rawValue,
        ]
      }
      return ["inputs": inputs, "outputs": outputs]
    }
  }

  // 指定されたデバイスが Bluetooth デバイスかどうかを判定する（#67）
  private static func isBluetoothDevice(uid: String?, name: String?, session: AVAudioSession) -> Bool {
    guard let uid = uid else { return false }
    guard let inputs = session.availableInputs else { return false }

    let btTypes: [AVAudioSession.Port] = [.bluetoothHFP, .bluetoothLE, .bluetoothA2DP]

    if let port = inputs.first(where: { $0.uid == uid }),
       btTypes.contains(port.portType) {
      return true
    }

    if let name = name,
       let port = inputs.first(where: { $0.portName == name }),
       btTypes.contains(port.portType) {
      return true
    }

    return false
  }
}
