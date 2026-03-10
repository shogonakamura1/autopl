# iOS AVAudioSession 実機挙動メモ

このファイルは**実機テストで確認された事実**を蓄積する場所である。
AI がオーディオ関連のバグを修正する際、推測ではなくこの文書の事実に基づいて判断すること。

> 新しい事実が判明したら、必ずこのファイルに追記すること。

---

## 1. AVAudioSession.Port の rawValue

| Swift の列挙子 | rawValue（実際の文字列） | 備考 |
|---|---|---|
| `.builtInMic` | `"MicrophoneBuiltIn"` | `.builtInMicrophone` は存在しない。#62 で修正 |
| `.builtInSpeaker` | `"Speaker"` | |
| `.bluetoothA2DP` | `"BluetoothA2DPOutput"` | 出力専用（高音質ステレオ） |
| `.bluetoothHFP` | `"BluetoothHFP"` | 入出力両対応（低音質モノラル） |
| `.bluetoothLE` | `"BluetoothLE"` | |

**教訓**: Swift の `AVAudioSession.Port` 列挙子名と rawValue は異なる。コード内でフィルタする際は列挙子（`.builtInMic`）を使い、rawValue 文字列をハードコードしない。

---

## 2. Bluetooth プロファイル切り替え（A2DP ↔ HFP）

### 確認済みの事実

- Bluetooth イヤホン接続中、`setCategory(.playAndRecord)` を呼ぶと **A2DP → HFP に自動切り替え**が発生する
- HFP は**モノラル・低ビットレート**のため、音楽の音質が著しく低下する
- `setCategory` は `expo-speech-recognition` の `start()` 内部で呼ばれる
- `setCategory` を**設定画面を開いただけで呼ぶと、音楽再生中に音質が低下する**（#59 で修正）

### 対策（現在の実装）

- 設定画面（`useAudioDeviceRoute`）では `setCategory` を呼ばない。デバイス一覧の取得のみ行う
- `setCategory` は音声認識の `start` 時のみ実行される（`expo-speech-recognition` 内部で自動実行）
- `iosCategory` オプションで `allowBluetooth` と `allowBluetoothA2DP` を両方指定し、iOS に最適なプロファイルを選ばせる

---

## 3. availableInputs と Bluetooth デバイス

### 確認済みの事実

- `AVAudioSession.sharedInstance().availableInputs` は**現在のカテゴリ設定で利用可能なデバイス**のみ返す
- A2DP 接続中（`allowBluetooth` 未設定時）は、Bluetooth デバイスが `availableInputs` に**含まれない**
- `setCategory(.playAndRecord, options: .allowBluetooth)` 後に初めて Bluetooth マイクが `availableInputs` に出現する
- そのため `setPreferredInput` を音声認識の `start` イベント（= `setCategory` 完了後）で呼ぶ必要がある（#55, #59 で修正）

### 対策（現在の実装）

- `useVoiceRecognition` の `start` イベントリスナー内で `setPreferredInput` を適用
- `AudioRouteModule.swift` の `setPreferredInput` は、`availableInputs` にデバイスが見つからない場合はサイレントに何もしない（エラーにしない）
- `getAvailableInputs` では A2DP 出力中の Bluetooth デバイスを `currentRoute.outputs` から補完して返す

---

## 4. expo-audio / expo-av / react-native-track-player の共存

### 確認済みの事実

- `expo-av` の `Audio.setAudioModeAsync` は内部で `setCategory` を呼ぶため、Bluetooth プロファイル切り替えが発生する（#48 で expo-audio に移行した原因）
- `expo-audio` の `setAudioModeAsync` も `setCategory` を呼ぶが、`allowsRecording: true` を設定することで TrackPlayer の `PlayAndRecord` カテゴリと競合しない（#48 で修正）
- `soundService`（フィードバック音）で `allowsRecording: false` にすると、expo-audio が `Playback` カテゴリに戻してしまい、音声認識時に再度プロファイル切り替えが走る
- `keepAudioSessionActive: true` を使うことで、フィードバック音再生後にセッションが非アクティブ化されず TrackPlayer が中断しない

### ライブラリの役割分担（現在）

| 用途 | ライブラリ | 理由 |
|---|---|---|
| 音楽再生 | `react-native-track-player` | バックグラウンド再生・ロック画面対応 |
| フィードバック音 | `expo-audio` | 短い音の再生に適切。expo-av は Bluetooth 問題あり |
| 音声認識 | `expo-speech-recognition` | iOS の SFSpeechRecognizer を利用 |

---

## 5. expo-speech-recognition の挙動

### continuous モードの results 配列

- `continuous: true` の場合、`event.results` 配列にセグメントが**蓄積**される
- `results[0]` は最初のセグメント（ウェイクワード部分）のまま固定される
- **最新の認識結果は `results[results.length - 1]`** を読む必要がある（#60 で修正）
- `results[0]` を読むと、ウェイクワードの後にコマンドを言っても常にウェイクワードのテキストが返り、コマンドが認識されない

### start イベント

- `start` イベントは `expo-speech-recognition` が `setCategory` + `setActive` を完了した後に発火する
- このタイミングで `setPreferredInput` を呼ぶと、`allowBluetooth` が有効な状態なので Bluetooth マイクが利用可能

### no-speech / speech-timeout エラー

- ユーザーが何も話さないと `no-speech` または `speech-timeout` エラーが発生する
- これは正常な挙動なのでエラーログではなく `console.warn` で記録する（#46 で修正）
- `end` イベント後に再起動すれば連続リスニングが継続する

---

## 6. AudioRouteModule（カスタムネイティブモジュール）

### ビルド関連

- Expo Modules として `modules/audio-route/` に配置
- `requireOptionalNativeModule` を使い、prebuild 前（ネイティブモジュール未ビルド時）でもクラッシュしない（#55 で修正）
- podspec ファイルが必要（#56 で追加）

### 設計上の注意

- `getAvailableInputs` / `getAvailableOutputs` は `setCategory` を呼ばない。呼ぶと音楽が途切れる
- `setPreferredInput` も `setCategory` を呼ばない。`availableInputs` に無いデバイスはサイレントにスキップ
- `setPreferredOutput` は `overrideOutputAudioPort` を使用（`.speaker` で内蔵スピーカー強制、`.none` で通常ルーティング）

---

## 7. Bluetooth デバイスの UID とプロファイル切り替え

### 確認済みの事実

- A2DP 出力専用デバイス（Bluetooth スピーカー）は `availableInputs` に含まれない（入力非対応）
- A2DP モードの UID と HFP モードの UID は**同じデバイスでも異なる場合がある**
- `setPreferredInput` は `availableInputs` の UID 完全一致で検索するため、プロファイル切替後に UID が変わるとサイレントに失敗する（#63 で修正）
- `currentRoute.outputs` に A2DP デバイスが出現しても、そのデバイスが入力（マイク）に対応するとは限らない

### 対策（現在の実装）

- `getAvailableInputs` から A2DP フォールバックを削除（偽 HFP エントリの問題）
- `setPreferredInput` に名前ベースのフォールバック検索を追加
- `audioDeviceStore` にデバイス名を保存し、UID 不一致時に名前で再検索
- TS 層で Bluetooth デバイスを入出力両方のピッカーに表示（ユーザーが自由に選択可能）

---

## 8. expo-speech-recognition continuous モードのトランスクリプト蓄積

### 確認済みの事実

- continuous モードでは `event.results` のトランスクリプトが蓄積される場合がある
- 蓄積されたテキスト内に前回のコマンド（例: 「再生」）が残ると、`matchCommand` が `Object.entries` の順番で常に先頭のコマンドをマッチしてしまう（#63 で修正）
- `Object.entries(commands)` は PLAY を最初に返すため、蓄積テキストに「再生」が含まれると他のコマンドが実行されない

### 対策（現在の実装）

- ウェイクワード検出時のトランスクリプトを記録（`wakeWordTranscriptRef`）
- コマンドマッチング時はウェイクワード部分を除外し、新しいテキストのみで判定
- セッション再開で結果がリセットされた場合も正常動作（`startsWith` チェック）

---

## 9. expo-speech-recognition の AVAudioEngine 入力キャプチャタイミング

### 確認済みの事実

- `expo-speech-recognition` の `start()` 内部フロー:
  1. `setupAudioSession()` → `setCategory` + `setActive`
  2. `AVAudioEngine()` 作成 → `inputNode` が**この時点の**入力デバイスをキャプチャ
  3. `prepareEngine()` → `engine.prepare()` + `engine.start()`
  4. `startHandler()` 発火（= `start` イベント）
- `start` イベント後に `setPreferredInput` を呼んでも、`AVAudioEngine.inputNode` は既に作成済みなので**マイクルーティングに反映されない**（#65 で判明）
- `setPreferredInput` を `start()` の**前**に呼ぶ必要がある
- ただし、`allowBluetooth` 未設定の状態では Bluetooth デバイスが `availableInputs` に含まれない（セクション3参照）
- **解決策**: `start()` の前に同じカテゴリ（`playAndRecord` + `allowBluetooth`）で `setCategory` + `setActive` + `setPreferredInput` を呼ぶ。expo-speech-recognition 側の `setCategory` は同一設定なら no-op になり、`preferredInput` が維持される

### 対策（現在の実装）

- `AudioRouteModule.swift` に `prepareSessionForRecognition` を追加（#65）
- `useVoiceRecognition` の `startRecognition` で `ExpoSpeechRecognitionModule.start()` の前に `prepareSessionForRecognition` を呼ぶ
- `start` イベントリスナーはバックアップとして残す（`prepareSessionForRecognition` が何らかの理由で失敗した場合のフォールバック）

---

## 10. iOS の availableOutputs API の不在

### 確認済みの事実

- iOS には `availableInputs` に相当する `availableOutputs` API が**存在しない**
- 出力デバイスの列挙は `currentRoute.outputs` でしか取得できないが、これは**現在アクティブな**出力のみ
- A2DP 出力専用デバイス（Bluetooth スピーカー等）が非アクティブの場合、どの API からも取得できない
- Bluetooth HFP/LE デバイスは入出力両対応のため `availableInputs` から検出可能

### 対策（現在の実装）

- `getAvailableOutputs` で `currentRoute.outputs` に加え、`availableInputs` の HFP/LE デバイスも列挙（#65）
- TS 層で Bluetooth デバイスを入出力両方のピッカーにマージ表示
- A2DP 専用デバイスがアクティブ出力でない場合は検出できない制限を許容

---

## 11. `.defaultToSpeaker` と Bluetooth HFP マイクルーティングの競合

### 確認済みの事実

- `.defaultToSpeaker` は「受話器ではなく内蔵スピーカーから出力する」オプション
- HFP は入出力同期プロトコル: `setPreferredInput` で Bluetooth マイクを選択すると、出力も自動的に同じ Bluetooth デバイスに切り替わる（Apple Technical Q&A QA1799）
- `.defaultToSpeaker` が出力を内蔵スピーカーに強制すると、HFP の入出力同期と矛盾が発生
- iOS はこの矛盾を「Bluetooth マイクの `setPreferredInput` を無視する」ことで解決する
- 結果: `setPreferredInput` を正しく呼んでも内蔵マイクが使われ続ける（#67 で判明）
- Apple Developer Forums #713197, #730600 で同じ問題が報告されている

### 対策（現在の実装）

- `prepareSessionForRecognition` で Bluetooth マイク選択時は `.defaultToSpeaker` を除外（#67）
- `expo-speech-recognition.start()` に渡す `iosCategory` も動的に構築し、同じオプションを使用
- Bluetooth マイク未選択時（内蔵マイク使用時）のみ `.defaultToSpeaker` を含める

---

## 12. A2DP 出力専用デバイスの追跡

### 確認済みの事実

- A2DP 出力専用デバイス（Bluetooth スピーカー等）は `availableInputs` に含まれない
- `currentRoute.outputs` に含まれるのは**現在アクティブな**出力のみ
- 別のデバイスがアクティブ出力になると、A2DP スピーカーは `currentRoute.outputs` から消失する
- iOS には `availableOutputs` API が存在しないため、非アクティブな出力デバイスを列挙する手段がない

### 対策（現在の実装）

- `AVAudioSession.routeChangeNotification` を監視し、A2DP デバイスをモジュールレベルでキャッシュ（#67）
- デバイス切断時（`oldDeviceUnavailable`）はキャッシュから該当デバイスを削除
- `getAvailableOutputs` でキャッシュされた A2DP デバイスも含めて返す
- TS 層では A2DP デバイスをスピーカーピッカーのみに表示（マイク非対応のため入力ピッカーには含めない）
- ルート変更イベントを JS 層に `onAudioRouteChange` として発行し、デバイスリストを自動更新

---

## 13. expo-speech-recognition の setCategory() が preferredInput をリセットする問題

### 確認済みの事実

- `expo-speech-recognition` の `prepareMicrophoneRecognition()` は内部で `setupAudioSession()` → `AVAudioEngine()` を連続実行
- `setupAudioSession()` 内の `setCategory()` は、同一パラメータであっても `preferredInput` をリセットする可能性がある（iOS 16+ で確認）
- `prepareSessionForRecognition` で事前に `setPreferredInput` を設定しても、ライブラリの `setCategory()` でリセットされる
- 結果として `AVAudioEngine.inputNode` は内蔵マイクをキャプチャしてしまう

### 対策（現在の実装）

- `expo-speech-recognition` を `patch-package` でパッチし、`setupAudioSession()` と `AVAudioEngine()` の間で `setPreferredInput` を再適用（#67）
- `SpeechRecognitionOptions` に `iosPreferredInputUID` / `iosPreferredInputName` フィールドを追加
- `restartAudioEngineForRouteChange()` でも同様に `setPreferredInput` を再適用
- JS 側から `ExpoSpeechRecognitionModule.start()` に新フィールドを渡す

---

## 追記ルール

新しい事実が判明した場合、以下の形式で追記すること:

```markdown
## N. セクションタイトル

### 確認済みの事実

- 事実1（#Issue番号 で確認）
- 事実2

### 対策（現在の実装）

- 対策1
- 対策2
```

**推測や未確認の情報は書かない。実機で確認された事実のみ記載する。**
