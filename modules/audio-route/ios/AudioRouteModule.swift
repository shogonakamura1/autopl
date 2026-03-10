import ExpoModulesCore
import AVFoundation

public class AudioRouteModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AudioRoute")

    // 接続済み入力デバイス（マイク）一覧を返す
    // setCategory は呼ばない（音楽再生を中断させないため）
    // A2DP 接続中の Bluetooth デバイスは currentRoute.outputs から補完する
    AsyncFunction("getAvailableInputs") { () -> [[String: String]] in
      let session = AVAudioSession.sharedInstance()
      var result: [[String: String]] = []

      if let inputs = session.availableInputs {
        result = inputs.map { port in
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
    // Bluetooth マイクの場合、availableInputs に出るよう allowBluetooth を付与する
    AsyncFunction("setPreferredInput") { (uid: String?) throws in
      let session = AVAudioSession.sharedInstance()

      guard let uid = uid else {
        try session.setPreferredInput(nil)
        return
      }

      // 通常の入力から探す
      if let inputs = session.availableInputs,
         let port = inputs.first(where: { $0.uid == uid }) {
        try session.setPreferredInput(port)
        return
      }

      // 見つからない場合は Bluetooth デバイスの可能性
      // allowBluetooth を付与して再探索する
      let originalOptions = session.categoryOptions
      if !originalOptions.contains(.allowBluetooth) {
        try? session.setCategory(
          session.category,
          mode: session.mode,
          options: originalOptions.union(.allowBluetooth)
        )
      }

      if let inputs = session.availableInputs,
         let port = inputs.first(where: { $0.uid == uid }) {
        // allowBluetooth は維持する（HFP マイクに必要）
        try session.setPreferredInput(port)
      } else {
        // それでも見つからない場合は元のオプションに戻して自動入力
        if !originalOptions.contains(.allowBluetooth) {
          try? session.setCategory(
            session.category,
            mode: session.mode,
            options: originalOptions
          )
        }
        try session.setPreferredInput(nil)
      }
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
