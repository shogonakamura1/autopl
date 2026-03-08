import { VoiceCommand, CommandMap, PlaybackRate, Settings } from '../types'

/**
 * Default Wakeword
 */
export const DEFAULT_WAKE_WORD = 'はい行きます'

/**
 * Default Commands
 */
export const DEFAULT_COMMANDS: CommandMap = {
  [VoiceCommand.PLAY]: '再生',
  [VoiceCommand.PAUSE]: '停止',
  [VoiceCommand.NEXT]: '次',
  [VoiceCommand.PREVIOUS]: '前',
  [VoiceCommand.SKIP_TO_START]: '最初から',
  [VoiceCommand.VOLUME_UP]: '音量上げて',
  [VoiceCommand.VOLUME_DOWN]: '音量下げて',
}

/**
 * Default Timeout (seconds)
 */
export const DEFAULT_TIMEOUT_SECONDS = 10

/**
 * Default Playback Rate
 */
export const DEFAULT_PLAYBACK_RATE = PlaybackRate.NORMAL

/**
 * Default Sound Enabled
 */
export const DEFAULT_SOUND_ENABLED = true

/**
 * Default Settings
 */
export const DEFAULT_SETTINGS: Settings = {
  wakeWord: DEFAULT_WAKE_WORD,
  commands: DEFAULT_COMMANDS,
  timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
  soundEnabled: DEFAULT_SOUND_ENABLED,
  onboardingDone: false,
}

/**
 * File Import Constraints
 */
export const FILE_IMPORT_CONSTRAINTS = {
  ALLOWED_EXTENSIONS: ['.mp3', '.wav', '.m4a'],
  MAX_FILE_SIZE_MB: 500,
}

/**
 * Playback Rate Options
 */
export const PLAYBACK_RATE_OPTIONS: Array<{ label: string; rate: PlaybackRate }> = [
  { label: '0.25x', rate: PlaybackRate.QUARTER },
  { label: '0.5x', rate: PlaybackRate.HALF },
  { label: '0.75x', rate: PlaybackRate.THREE_QUARTERS },
  { label: '1x', rate: PlaybackRate.NORMAL },
  { label: '2x', rate: PlaybackRate.DOUBLE },
]

/**
 * Timeout Options (seconds)
 */
export const TIMEOUT_OPTIONS = [3, 5, 10, 15, 20, 30]

/**
 * AsyncStorage Keys
 */
export const STORAGE_KEYS = {
  FILES: 'files',
  SELECTED_FILE_ID: 'selected_file_id',
  SETTINGS: 'settings',
  ONBOARDING_DONE: 'onboarding_done',
} as const
