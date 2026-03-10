import ExpoModulesCore
import AVFoundation

public class AudioRouteModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AudioRoute")

    // 接続済み入力デバイス（マイク）一覧を返す
    AsyncFunction("getAvailableInputs") { () -> [[String: String]] in
      guard let inputs = AVAudioSession.sharedInstance().availableInputs else {
        return []
      }
      return inputs.map { port in
        [
          "uid": port.uid,
          "name": port.portName,
          "type": port.portType.rawValue,
        ]
      }
    }

    // 利用可能な出力デバイス一覧を返す
    // 内蔵スピーカーは常に含める。現在接続中の外部デバイス（Bluetooth/有線）も列挙。
    AsyncFunction("getAvailableOutputs") { () -> [[String: String]] in
      var outputs: [[String: String]] = []

      // 現在のルートの出力ポートを追加（接続中の外部デバイス）
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

      // 内蔵スピーカーは常に選択肢として末尾に追加
      outputs.append([
        "uid": "builtin_speaker",
        "name": "内蔵スピーカー",
        "type": AVAudioSession.Port.builtInSpeaker.rawValue,
      ])

      return outputs
    }

    // 優先する入力デバイス（マイク）を設定する。nil で自動に戻す。
    AsyncFunction("setPreferredInput") { (uid: String?) throws in
      let session = AVAudioSession.sharedInstance()

      guard let uid = uid else {
        try session.setPreferredInput(nil)
        return
      }

      guard let inputs = session.availableInputs,
            let port = inputs.first(where: { $0.uid == uid }) else {
        // 指定ポートが見つからない場合は自動に戻す（エラーにしない）
        try session.setPreferredInput(nil)
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
