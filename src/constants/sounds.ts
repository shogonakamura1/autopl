/**
 * Feedback Sound File Paths
 */
export const SOUND_PATHS = {
  WAKEWORD: require('../../assets/sounds/wakeword.mp3'),
  SUCCESS: require('../../assets/sounds/success.mp3'),
  FAILURE: require('../../assets/sounds/failure.mp3'),
} as const

/**
 * Sound Types
 */
export enum SoundType {
  WAKEWORD = 'wakeword',
  SUCCESS = 'success',
  FAILURE = 'failure',
}
