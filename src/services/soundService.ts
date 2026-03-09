import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av'
import { SoundType, SOUND_PATHS } from '../constants/sounds'
import { useSettingsStore } from '../stores/settingsStore'

type SoundMap = Record<SoundType, Audio.Sound | null>

const loadedSounds: SoundMap = {
  [SoundType.WAKEWORD]: null,
  [SoundType.SUCCESS]: null,
  [SoundType.FAILURE]: null,
}

const soundSources: Record<SoundType, number> = {
  [SoundType.WAKEWORD]: SOUND_PATHS.WAKEWORD,
  [SoundType.SUCCESS]: SOUND_PATHS.SUCCESS,
  [SoundType.FAILURE]: SOUND_PATHS.FAILURE,
}

/**
 * フィードバック音サービス
 * expo-av を使ってフィードバック音を再生する
 *
 * react-native-track-player（音楽再生）や expo-speech-recognition（音声認識）と
 * 音声セッションを共有するため、InterruptionModeIOS.MixWithOthers を設定する。
 * これにより Bluetooth プロファイルの切り替えを防ぎ、音楽再生・音声認識を中断しない。
 */
export const soundService = {
  /**
   * 音声ファイルをプリロードする
   */
  async preload(): Promise<void> {
    try {
      // MixWithOthers: TrackPlayer の音楽再生・expo-speech-recognition と共存させる
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
      })

      for (const soundType of Object.values(SoundType)) {
        if (!loadedSounds[soundType]) {
          const { sound } = await Audio.Sound.createAsync(
            soundSources[soundType]
          )
          loadedSounds[soundType] = sound
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
      const sound = loadedSounds[soundType]
      if (sound) {
        await sound.setPositionAsync(0)
        await sound.playAsync()
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
        const sound = loadedSounds[soundType]
        if (sound) {
          await sound.unloadAsync()
          loadedSounds[soundType] = null
        }
      } catch (error) {
        console.error('[SoundService] unload failed:', error)
      }
    }
  },
}
