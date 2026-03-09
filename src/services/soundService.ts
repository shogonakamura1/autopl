import { createAudioPlayer, setAudioModeAsync } from 'expo-audio'
import type { AudioPlayer } from 'expo-audio'
import { SoundType, SOUND_PATHS } from '../constants/sounds'
import { useSettingsStore } from '../stores/settingsStore'

type PlayerMap = Record<SoundType, AudioPlayer | null>

const SOUND_SOURCES: Record<SoundType, number> = {
  [SoundType.WAKEWORD]: SOUND_PATHS.WAKEWORD,
  [SoundType.SUCCESS]: SOUND_PATHS.SUCCESS,
  [SoundType.FAILURE]: SOUND_PATHS.FAILURE,
}

const players: PlayerMap = {
  [SoundType.WAKEWORD]: null,
  [SoundType.SUCCESS]: null,
  [SoundType.FAILURE]: null,
}

/**
 * フィードバック音サービス
 * expo-audio を使ってフィードバック音を再生する
 *
 * keepAudioSessionActive: true により、再生終了後に音声セッションが
 * 非アクティブ化されず、TrackPlayer や expo-speech-recognition を中断しない。
 * interruptionMode: 'mixWithOthers' で他の音声セッションと共存する。
 */
export const soundService = {
  /**
   * 音声ファイルをプリロードする
   */
  async preload(): Promise<void> {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'mixWithOthers',
        allowsRecording: false,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      })

      for (const soundType of Object.values(SoundType)) {
        if (!players[soundType]) {
          players[soundType] = createAudioPlayer(SOUND_SOURCES[soundType], {
            // 再生完了後も音声セッションを維持してTrackPlayerを中断しない
            keepAudioSessionActive: true,
          })
        }
      }
    } catch (error) {
      console.error('[SoundService] preload failed:', error)
    }
  },

  /**
   * フィードバック音を再生する
   * settingsStore の soundEnabled が false の場合は再生しない
   */
  async play(soundType: SoundType): Promise<void> {
    const soundEnabled = useSettingsStore.getState().soundEnabled
    if (!soundEnabled) return

    try {
      const player = players[soundType]
      if (player) {
        await player.seekTo(0)
        player.play()
      }
    } catch (error) {
      // フィードバック音の再生失敗はUIをブロックしない
      console.error('[SoundService] play failed:', error)
    }
  },

  /**
   * リソースを解放する
   */
  async unload(): Promise<void> {
    for (const soundType of Object.values(SoundType)) {
      try {
        const player = players[soundType]
        if (player) {
          player.release()
          players[soundType] = null
        }
      } catch (error) {
        console.error('[SoundService] unload failed:', error)
      }
    }
  },
}
