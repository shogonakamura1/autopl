import { usePlayerStore } from '../playerStore'
import { PlaybackRate } from '../../types'

describe('playerStore', () => {
  beforeEach(() => {
    usePlayerStore.getState().resetPlayer()
  })

  describe('play / pause', () => {
    it('playを呼ぶとisPlayingがtrueになる', () => {
      usePlayerStore.getState().play()
      expect(usePlayerStore.getState().isPlaying).toBe(true)
    })

    it('pauseを呼ぶとisPlayingがfalseになる', () => {
      usePlayerStore.getState().play()
      usePlayerStore.getState().pause()
      expect(usePlayerStore.getState().isPlaying).toBe(false)
    })
  })

  describe('seekTo', () => {
    it('指定した秒数にcurrentPositionが設定される', () => {
      usePlayerStore.getState().seekTo(120)
      expect(usePlayerStore.getState().currentPosition).toBe(120)
    })

    it('負の値を指定すると0になる', () => {
      usePlayerStore.getState().seekTo(-10)
      expect(usePlayerStore.getState().currentPosition).toBe(0)
    })
  })

  describe('setPlaybackRate', () => {
    it('再生速度が変更される', () => {
      usePlayerStore.getState().setPlaybackRate(PlaybackRate.DOUBLE)
      expect(usePlayerStore.getState().playbackRate).toBe(PlaybackRate.DOUBLE)
    })
  })

  describe('setCurrentPosition', () => {
    it('現在位置が更新される', () => {
      usePlayerStore.getState().setCurrentPosition(60)
      expect(usePlayerStore.getState().currentPosition).toBe(60)
    })

    it('負の値を指定すると0になる', () => {
      usePlayerStore.getState().setCurrentPosition(-5)
      expect(usePlayerStore.getState().currentPosition).toBe(0)
    })
  })

  describe('setDuration', () => {
    it('曲の長さが設定される', () => {
      usePlayerStore.getState().setDuration(300)
      expect(usePlayerStore.getState().duration).toBe(300)
    })

    it('負の値を指定すると0になる', () => {
      usePlayerStore.getState().setDuration(-1)
      expect(usePlayerStore.getState().duration).toBe(0)
    })
  })

  describe('resetPlayer', () => {
    it('全ての状態が初期値にリセットされる', () => {
      usePlayerStore.getState().play()
      usePlayerStore.getState().seekTo(120)
      usePlayerStore.getState().setDuration(300)
      usePlayerStore.getState().setPlaybackRate(PlaybackRate.HALF)

      usePlayerStore.getState().resetPlayer()

      const state = usePlayerStore.getState()
      expect(state.isPlaying).toBe(false)
      expect(state.currentPosition).toBe(0)
      expect(state.duration).toBe(0)
      expect(state.playbackRate).toBe(PlaybackRate.NORMAL)
    })
  })
})
