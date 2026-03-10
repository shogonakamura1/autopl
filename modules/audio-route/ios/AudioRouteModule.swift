import ExpoModulesCore
import AVFoundation

public class AudioRouteModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AudioRoute")

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

    // 利用可能な出力デバイス一覧を返す
    // 1. currentRoute.outputs から現在アクティブな外部デバイスを列挙
    // 2. availableInputs から HFP 双方向デバイスを追加（#65）
    //    HFP デバイスは入出力両対応だが currentRoute.outputs に出ない場合がある
    //    （例: A2DP で別デバイスが出力中の場合）
    // 3. 内蔵スピーカーは常に含める
    AsyncFunction("getAvailableOutputs") { () -> [[String: String]] in
      let session = AVAudioSession.sharedInstance()
      var outputs: [[String: String]] = []
      var seenUIDs = Set<String>()

      // 1. 現在アクティブな出力デバイス
      for port in session.currentRoute.outputs {
        if port.portType != .builtInSpeaker {
          outputs.append([
            "uid": port.uid,
            "name": port.portName,
            "type": port.portType.rawValue,
          ])
          seenUIDs.insert(port.uid)
        }
      }

      // 2. availableInputs に含まれる Bluetooth HFP/LE デバイスは双方向なので
      //    出力としても選択可能。currentRoute に出ていないものを追加する
      if let inputs = session.availableInputs {
        let btInputTypes: [AVAudioSession.Port] = [.bluetoothHFP, .bluetoothLE]
        for port in inputs where btInputTypes.contains(port.portType) {
          if !seenUIDs.contains(port.uid) {
            outputs.append([
              "uid": port.uid,
              "name": port.portName,
              "type": port.portType.rawValue,
            ])
            seenUIDs.insert(port.uid)
          }
        }
      }

      // 3. 内蔵スピーカーは常に含める
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
    AsyncFunction("prepareSessionForRecognition") { (uid: String?, name: String?) throws in
      let session = AVAudioSession.sharedInstance()

      // expo-speech-recognition と同じカテゴリ・オプションを設定
      // 先に設定しておくことで、expo-speech-recognition 側の setCategory は no-op になる
      try session.setCategory(
        .playAndRecord,
        mode: .default,
        options: [.allowBluetooth, .allowBluetoothA2DP, .defaultToSpeaker, .mixWithOthers]
      )
      try session.setActive(true, options: .notifyOthersOnDeactivation)

      // allowBluetooth が有効な状態で setPreferredInput を実行
      // この時点で availableInputs に Bluetooth デバイスが含まれている
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
}
