import ExpoModulesCore
import AVFoundation

public class AudioRouteModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AudioRoute")

    // 接続済み入力デバイス（マイク）一覧を返す
    // 開発用: 内蔵マイクは除外し外部デバイスのみ返す
    // setCategory は呼ばない（音楽再生を中断させないため）
    // A2DP 接続中の Bluetooth デバイスは currentRoute.outputs から補完する
    AsyncFunction("getAvailableInputs") { () -> [[String: String]] in
      let session = AVAudioSession.sharedInstance()
      var result: [[String: String]] = []

      if let inputs = session.availableInputs {
        // 開発用: 内蔵マイク (builtInMicrophone) を除外
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

      // A2DP 接続中の Bluetooth デバイスが availableInputs に出ない場合でも
      // マイク候補として追加する（allowBluetooth 未設定時の補完）
      let btOutputTypes: [AVAudioSession.Port] = [.bluetoothA2DP, .bluetoothLE]
      for port in session.currentRoute.outputs where btOutputTypes.contains(port.portType) {
        if !result.contains(where: { $0["uid"] == port.uid }) {
          result.append([
            "uid": port.uid,
            "name": port.portName,
            "type": AVAudioSession.Port.bluetoothHFP.rawValue,
          ])
        }
      }

      return result
    }

    // 利用可能な出力デバイス一覧を返す
    // 内蔵スピーカーは常に含める。現在接続中の外部デバイス（Bluetooth/有線）も列挙。
    AsyncFunction("getAvailableOutputs") { () -> [[String: String]] in
      var outputs: [[String: String]] = []

      let currentOutputs = AVAudioSession.sharedInstance().currentRoute.outputs
      for port in currentOutputs {
        if port.portType != .builtInSpeaker {
          outputs.append([
            "uid": port.uid,
            "name": port.portName,
            "type": port.portType.rawValue,
          ])
        }
      }

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
    AsyncFunction("setPreferredInput") { (uid: String?) throws in
      let session = AVAudioSession.sharedInstance()

      guard let uid = uid else {
        try session.setPreferredInput(nil)
        return
      }

      guard let inputs = session.availableInputs,
            let port = inputs.first(where: { $0.uid == uid }) else {
        // availableInputs に見つからない場合はセッション変更せず何もしない
        // 音声認識開始時に allowBluetooth が有効になった後に再適用される
        return
      }

      try session.setPreferredInput(port)
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
