import TrackPlayer, {
  Capability,
  AppKilledPlaybackBehavior,
} from 'react-native-track-player'

let isPlayerSetup = false

/**
 * react-native-track-player ラッパーサービス
 * 再生・停止・シーク・速度変更を担当
 */
export const audioService = {
  /**
   * プレイヤーを初期化する（アプリ起動時に1回のみ）
   */
  async setup(): Promise<void> {
    if (isPlayerSetup) return

    try {
      await TrackPlayer.setupPlayer()
      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SeekTo,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause],
        android: {
          appKilledPlaybackBehavior:
            AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        },
      })
      isPlayerSetup = true
    } catch (error) {
      console.error('[AudioService] setup failed:', error)
      throw error
    }
  },

  /**
   * トラックを読み込む（キューをリセットして新しいトラックを設定）
   */
  async loadTrack(filePath: string, title: string): Promise<void> {
    try {
      await audioService.setup()
      await TrackPlayer.reset()
      await TrackPlayer.add({
        id: filePath,
        url: filePath,
        title,
      })
    } catch (error) {
      console.error('[AudioService] loadTrack failed:', error)
      throw error
    }
  },

  /**
   * 再生する
   */
  async play(): Promise<void> {
    try {
      await TrackPlayer.play()
    } catch (error) {
      console.error('[AudioService] play failed:', error)
      throw error
    }
  },

  /**
   * 一時停止する
   */
  async pause(): Promise<void> {
    try {
      await TrackPlayer.pause()
    } catch (error) {
      console.error('[AudioService] pause failed:', error)
      throw error
    }
  },

  /**
   * 指定位置にシークする（秒単位）
   */
  async seekTo(seconds: number): Promise<void> {
    try {
      await TrackPlayer.seekTo(Math.max(0, seconds))
    } catch (error) {
      console.error('[AudioService] seekTo failed:', error)
      throw error
    }
  },

  /**
   * 再生速度を変更する
   */
  async setRate(rate: number): Promise<void> {
    try {
      await TrackPlayer.setRate(rate)
    } catch (error) {
      console.error('[AudioService] setRate failed:', error)
      throw error
    }
  },

  /**
   * 音量を設定する（0.0 〜 1.0）
   */
  async setVolume(volume: number): Promise<void> {
    try {
      await TrackPlayer.setVolume(Math.max(0, Math.min(1, volume)))
    } catch (error) {
      console.error('[AudioService] setVolume failed:', error)
      throw error
    }
  },

  /**
   * 現在の再生位置と曲の長さを取得する
   */
  async getProgress(): Promise<{ position: number; duration: number }> {
    try {
      const progress = await TrackPlayer.getProgress()
      return {
        position: progress.position,
        duration: progress.duration,
      }
    } catch (error) {
      console.error('[AudioService] getProgress failed:', error)
      return { position: 0, duration: 0 }
    }
  },

  /**
   * プレイヤーをリセットする（トラック解除）
   */
  async reset(): Promise<void> {
    try {
      await TrackPlayer.reset()
    } catch (error) {
      console.error('[AudioService] reset failed:', error)
    }
  },
}
