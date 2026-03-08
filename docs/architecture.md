# Autopl - アーキテクチャ設計書

## 1. 技術スタック

| カテゴリ | 採用技術 | 理由 |
|---|---|---|
| フレームワーク | React Native (Expo) | クロスプラットフォーム、Expoエコシステム |
| 言語 | TypeScript | 型安全性 |
| ナビゲーション | React Navigation v7 | デファクトスタンダード |
| 状態管理 | Zustand | 軽量・モダン・React Nativeとの相性が良い |
| UIライブラリ | React Native Paper | Material Design 3、ダーク/ライト対応 |
| 設計指針 | Apple HIG | iOSらしいUX原則 |
| 音声認識 | expo-speech-recognition | 無料・iOS SFSpeechRecognizer・オンライン/オフライン自動切替 |
| 音楽再生 | react-native-track-player | バックグラウンド再生対応・ネイティブ音声API |
| ファイル操作 | expo-file-system | サンドボックス内へのコピー保存 |
| ファイル選択 | expo-document-picker | Files app連携 |
| データ永続化 | AsyncStorage + expo-file-system | 設定・ファイル一覧・選択状態の保存 |

---

## 2. ナビゲーション構造

```
App
└── DrawerNavigator（メイン画面ベース）
    ├── Drawer Content（左1/3）
    │   └── ファイル一覧（スクロール可能）
    │       ├── ファイル名（選択中は色変更）
    │       └── 左スワイプで削除ボタン表示
    │
    └── MainScreen（再生画面）
        └── 右上アイコン → SettingsScreen（スタック遷移）
```

---

## 3. 画面レイアウト

### 3.1 再生画面（メイン）

```
┌─────────────────────────┐
│ [≡]    ファイル名    [⚙] │  ← ヘッダー
│                         │     [≡] ハンバーガー: ドロワー開閉
│                         │     [⚙] 歯車: 設定画面へ
├─────────────────────────┤
│ [====----] 第1段  0:00  │
│ [========] 第2段  0:24  │
│ [--      ] 第3段  0:48  │
│           ...            │  ← 10分割再生バー（メイン）
│ [        ] 第10段 3:36  │     各段タップ → その区間先頭から再生
│                         │
│     ┌─────────────┐     │
│     │  🎙 聞き取り中 │     │  ← 「聞き取り中」モーダル
│     │  ～～～～～  │     │     （ウェイクワード検出時のみ表示）
│     └─────────────┘     │     中央配置・半透明背景・約1×1.5cm
│                         │
├─────────────────────────┤
│ 00:36 / 04:00           │  ← 再生時間
│  ◀    ⏸    ▶    [1x]  │  ← フッター
└─────────────────────────┘     [1x] タップ → 速度選択ポップアップ
                                 速度: 0.25x / 0.5x / 0.75x / 1x / 2x
```

### 3.2 ドロワー（ファイル一覧）

```
┌──────────┬──────────────┐
│ファイル名 │              │
│ ──────── │              │
│ 曲A.mp3  │   再生画面   │
│ 曲B.mp3  │  （暗く       │
│ 曲C.mp3  │   なる）      │
│（選択中） │              │
│  ↑色変更  │              │
│           │              │
│ ← スワイプで削除         │
└──────────┴──────────────┘
```

**選択中ファイルのハイライトカラー**

| テーマ | 背景色 | テキスト色 |
|---|---|---|
| ライトモード | Primary色（React Native Paper のtheme.colors.primaryContainer） | theme.colors.onPrimaryContainer |
| ダークモード | 同上（ダークテーマ自動適用） | 同上 |

### 3.3 設定画面

```
┌─────────────────────────┐
│ ← 設定                  │  ← ヘッダー（戻るボタン）
├─────────────────────────┤
│ ウェイクワード           │
│ [はい行きます        ]   │
├─────────────────────────┤
│ コマンド語              │
│ 再生    [再生        ]   │
│ 停止    [停止        ]   │
│ 次      [次          ]   │
│ 前      [前          ]   │
│ 最初から [最初から   ]   │
│ 音量上げて [音量上げて]  │
│ 音量下げて [音量下げて]  │
├─────────────────────────┤
│ タイムアウト秒数         │
│ [10                  ]   │
├─────────────────────────┤
│ フィードバック音         │
│ ○ ON  ● OFF            │
└─────────────────────────┘
```

---

## 4. 状態管理（Zustand）

### ストア構成

```typescript
// ファイルストア
interface FileStore {
  files: AudioFile[]        // インポート済みファイル一覧
  selectedFile: AudioFile | null  // 現在選択中のファイル
  addFile: (file: AudioFile) => void
  removeFile: (id: string) => void
  selectFile: (id: string) => void
}

// 再生ストア
interface PlayerStore {
  isPlaying: boolean
  currentPosition: number   // 秒
  duration: number          // 秒
  playbackRate: number      // 0.25 / 0.5 / 0.75 / 1.0 / 2.0
  play: () => void
  pause: () => void
  seekTo: (seconds: number) => void
  setPlaybackRate: (rate: number) => void
}

// 音声認識ストア
interface VoiceStore {
  isListening: boolean      // 「聞き取り中」状態
  isOnline: boolean         // オンライン状態
  startListening: () => void
  stopListening: () => void
}

// 設定ストア
interface SettingsStore {
  wakeWord: string          // デフォルト: "はい行きます"
  commands: CommandMap      // コマンド語マッピング
  timeoutSeconds: number    // デフォルト: 10
  soundEnabled: boolean     // フィードバック音ON/OFF
  updateSettings: (settings: Partial<Settings>) => void
}
```

---

## 5. データ永続化

### 保存対象と保存先

| データ | 保存先 | タイミング |
|---|---|---|
| インポートファイルの実体 | `expo-file-system` サンドボックス内 (`/documents/audio/`) | インポート時にコピー |
| ファイル一覧メタデータ（名前・パス・ID） | AsyncStorage | ファイル追加/削除時 |
| 最後に選択していたファイルID | AsyncStorage | ファイル選択時 |
| 全設定値 | AsyncStorage | 設定変更時 |

### 起動時の復元フロー

```
アプリ起動
↓
AsyncStorage からファイル一覧を読み込む
↓
最後に選択していたファイルIDを取得
↓
該当ファイルを選択状態で再生画面を表示（再生はしない）
↓
設定値を復元
```

---

## 6. 音声認識実装方針

### ライブラリ

`expo-speech-recognition`（iOS: SFSpeechRecognizer を使用、無料）

### オンライン/オフライン切替

```
アプリ起動 / ネットワーク状態変化
↓
NetInfo でオンライン状態を検出
↓
オンライン  → SFSpeechRecognizer のサーバーサイド認識（高精度）
オフライン → SFSpeechRecognizer のオンデバイス認識 + 警告バナー表示
            「オンラインになると音声認識の精度が向上します」
```

### 音声認識フロー（実装）

```
常時マイク監視（低負荷のウェイクワード検出モード）
↓
ウェイクワード検出
↓
フィードバック音（ピコーン） + 「聞き取り中」モーダル表示
↓
本格的な音声認識開始（最大10秒）
↓
テキスト取得 → コマンドマッピングと照合
↓
一致 → フィードバック音（ピコピコ） → 操作実行
不一致/タイムアウト → フィードバック音（ブブ） → 「認識できませんでした」ポップアップ
↓
「聞き取り中」モーダル非表示 → 待機状態へ
```

### マイク権限拒否時

```
初回起動 → マイク使用許可ダイアログ（iOS標準）
↓
拒否された場合
→ バナー表示:「マイクの使用が許可されていないため音声操作が使用できません。
              設定アプリから許可することで音声操作が使えるようになります。」
→ 手動操作（タップ）のみで全機能利用可能
```

---

## 7. ファイル管理実装

### インポートフロー

```
expo-document-picker でファイル選択（mp3/wav/m4a）
↓
expo-file-system で /documents/audio/{uuid}.{ext} にコピー
↓
メタデータ（id, name, path, duration）を AsyncStorage に追記
↓
Zustand の FileStore を更新
↓
ドロワーの一覧に追加表示
```

### Share Extension（他アプリからの共有）

LINEなどで受信したファイルの「共有」メニューから Autopl を選択した場合も、上記と同じインポートフローに流す。

### ファイル削除フロー

```
ドロワーでファイル名を左スワイプ → 「削除」ボタン表示
↓
削除ボタンタップ
↓
【選択中ファイルの場合】
→ 確認ダイアログ:「再生中のファイルを削除しますか？削除すると選択が解除されます。」
→ 確認 → 削除実行
↓
expo-file-system でファイル実体を削除
↓
AsyncStorage からメタデータを削除
↓
Zustand の FileStore を更新
```

---

## 8. フィードバック音

| タイミング | 音の種類 | 実装 |
|---|---|---|
| ウェイクワード検出 | ピコーン（短い通知音） | `expo-av` でバンドルした音声ファイルを再生 |
| コマンド認識成功 | ピコピコ（クイズ正解系） | 同上 |
| タイムアウト・失敗 | ブブ（失敗系） | 同上 |

設定で音のON/OFFを切り替え可能。音楽再生中でも独立して再生する。

---

## 9. ディレクトリ構造

```
autopl/
├── app/                        # Expo Router のルート
│   ├── _layout.tsx             # ルートレイアウト（ドロワー）
│   ├── index.tsx               # 再生画面（メイン）
│   └── settings.tsx            # 設定画面
├── src/
│   ├── components/
│   │   ├── player/
│   │   │   ├── SegmentedProgressBar.tsx  # 10分割再生バー
│   │   │   ├── PlayerControls.tsx        # フッター（再生/停止/前後）
│   │   │   ├── PlaybackRateSelector.tsx  # 再生速度ポップアップ
│   │   │   └── ListeningIndicator.tsx    # 「聞き取り中」モーダル
│   │   ├── drawer/
│   │   │   ├── FileList.tsx              # ファイル一覧
│   │   │   └── FileListItem.tsx          # ファイル行（スワイプ削除）
│   │   └── common/
│   │       └── OfflineBanner.tsx         # オフライン警告バナー
│   ├── stores/
│   │   ├── fileStore.ts         # Zustand: ファイル管理
│   │   ├── playerStore.ts       # Zustand: 再生状態
│   │   ├── voiceStore.ts        # Zustand: 音声認識状態
│   │   └── settingsStore.ts     # Zustand: 設定
│   ├── hooks/
│   │   ├── useVoiceRecognition.ts  # 音声認識ロジック
│   │   ├── useAudioPlayer.ts       # 再生制御ロジック
│   │   └── useFileImport.ts        # ファイルインポートロジック
│   ├── services/
│   │   ├── audioService.ts      # react-native-track-player ラッパー
│   │   ├── fileService.ts       # expo-file-system ラッパー
│   │   └── storageService.ts    # AsyncStorage ラッパー
│   ├── constants/
│   │   ├── sounds.ts            # フィードバック音ファイルパス
│   │   └── defaults.ts          # デフォルト設定値
│   └── types/
│       └── index.ts             # 型定義
├── assets/
│   └── sounds/
│       ├── wakeword.mp3         # ピコーン
│       ├── success.mp3          # ピコピコ
│       └── failure.mp3          # ブブ
└── docs/
    ├── requrements.md
    └── architecture.md
```

---

## 10. Phase 1 スコープ外（将来対応）

| 機能 | 理由 |
|---|---|
| バックグラウンド再生 | iOSのバックグラウンド音声認識の技術制約 |
| 音声録音によるウェイクワード登録 | 実装コストが高い（Phase 3） |
| 8カウント戻る・指定区間ループ | Phase 3 |
| BPM解析 | Phase 3 |
