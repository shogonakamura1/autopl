import TrackPlayer, { Event } from 'react-native-track-player'
import { SoundType } from '../constants/sounds'
import { useSettingsStore } from '../stores/settingsStore'

/**
 * フィードバック音のファイルパスマッピング
 * TrackPlayer はローカルファイルを require() ではなくパスで扱うため、
 * assets にバンドルされた音声ファイルを参照する
 */
const SOUND_URLS: Record<SoundType, string> = {
  [SoundType.WAKEWORD]: 'asset:///wakeword.mp3',
  [SoundType.SUCCESS]: 'asset:///success.mp3',
  [SoundType.FAILURE]: 'asset:///failure.mp3',
}

let isFeedbackPlaying = false

/**
 * フィードバック音サービス
 * react-native-track-player を使ってフィードバック音を再生する
 */
export const soundService = {
  /**
   * 音声ファイルをプリロードする（TrackPlayerでは不要だが互換性のため維持）
   */
  async preload(): Promise<void> {
    // TrackPlayer はトラック追加時にロードするためプリロード不要
  },

  /**
   * フィードバック音を再生する
   * settingsStore の soundEnabled が false の場合は再生しない
   */
  async play(soundType: SoundType): Promise<void> {
    const soundEnabled = useSettingsStore.getState().soundEnabled
    if (!soundEnabled) return
    if (isFeedbackPlaying) return

    try {
      isFeedbackPlaying = true

      // 現在のキューを保存して復元するのではなく、
      // 短い効果音なのでキューの末尾に追加して再生後に削除する
      const queue = await TrackPlayer.getQueue()
      const currentTrackIndex = await TrackPlayer.getActiveTrackIndex()
      const progress = await TrackPlayer.getProgress()

      const feedbackTrack = {
        id: `feedback-${soundType}-${Date.now()}`,
        url: SOUND_URLS[soundType],
        title: soundType,
        artist: 'Autopl',
      }

      await TrackPlayer.add(feedbackTrack)
      const newQueue = await TrackPlayer.getQueue()
      await TrackPlayer.skip(newQueue.length - 1)
      await TrackPlayer.play()

      // 再生完了を待つ
      await new Promise<void>((resolve) => {
        const subscription = TrackPlayer.addEventListener(
          Event.PlaybackQueueEnded,
          () => {
            subscription.remove()
            resolve()
          }
        )
        // 最大3秒でタイムアウト
        setTimeout(() => {
          subscription.remove()
          resolve()
        }, 3000)
      })

      // フィードバックトラックを削除して元の状態に復元
      const updatedQueue = await TrackPlayer.getQueue()
      const feedbackIndex = updatedQueue.findIndex(
        (track) => track.id === feedbackTrack.id
      )
      if (feedbackIndex >= 0) {
        await TrackPlayer.remove(feedbackIndex)
      }

      // 元のトラックに戻る
      if (queue.length > 0 && currentTrackIndex !== undefined) {
        await TrackPlayer.skip(currentTrackIndex)
        await TrackPlayer.seekTo(progress.position)
      }
    } catch (error) {
      // フィードバック音の再生失敗はUIをブロックしない
      console.error('[SoundService] play failed:', error)
    } finally {
      isFeedbackPlaying = false
    }
  },

  /**
   * リソースを解放する（TrackPlayerでは不要だが互換性のため維持）
   */
  async unload(): Promise<void> {
    // TrackPlayer のリソース解放は audioService.reset() で行う
  },
}
