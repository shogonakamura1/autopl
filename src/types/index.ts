/**
 * Audio File Metadata
 */
export interface AudioFile {
  id: string // UUID
  name: string // ファイル名（拡張子含む）
  path: string // サンドボックス内のパス
  duration: number // 秒単位
  createdAt: number // インポート日時（タイムスタンプ）
}

/**
 * Voice Command
 */
export enum VoiceCommand {
  PLAY = 'play',
  PAUSE = 'pause',
  NEXT = 'next',
  PREVIOUS = 'previous',
  SKIP_TO_START = 'skip_to_start',
  VOLUME_UP = 'volume_up',
  VOLUME_DOWN = 'volume_down',
}

/**
 * Command mapping (日本語コマンド名 → VoiceCommand)
 */
export type CommandMap = Record<VoiceCommand, string>

/**
 * Playback Rate
 */
export enum PlaybackRate {
  QUARTER = 0.25,
  HALF = 0.5,
  THREE_QUARTERS = 0.75,
  NORMAL = 1.0,
  DOUBLE = 2.0,
}

/**
 * Voice Recognition State
 */
export enum VoiceRecognitionState {
  IDLE = 'idle',
  LISTENING_FOR_WAKEWORD = 'listening_for_wakeword',
  LISTENING_FOR_COMMAND = 'listening_for_command',
  PROCESSING = 'processing',
}

/**
 * App Settings
 */
export interface Settings {
  wakeWord: string
  commands: CommandMap
  timeoutSeconds: number
  soundEnabled: boolean
  onboardingDone: boolean
}

/**
 * File Import Validation Error
 */
export interface FileImportError {
  code:
    | 'INVALID_FORMAT'
    | 'FILE_TOO_LARGE'
    | 'DUPLICATE_FILE'
    | 'UNKNOWN'
  message: string
}
