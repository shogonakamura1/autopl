import { audioService } from '../audioService'

// react-native-track-player をモック
const mockSetupPlayer = jest.fn().mockResolvedValue(undefined)
const mockUpdateOptions = jest.fn().mockResolvedValue(undefined)
const mockReset = jest.fn().mockResolvedValue(undefined)
const mockAdd = jest.fn().mockResolvedValue(undefined)
const mockPlay = jest.fn().mockResolvedValue(undefined)
const mockPause = jest.fn().mockResolvedValue(undefined)
const mockSeekTo = jest.fn().mockResolvedValue(undefined)
const mockSetRate = jest.fn().mockResolvedValue(undefined)
const mockSetVolume = jest.fn().mockResolvedValue(undefined)
const mockGetProgress = jest
  .fn()
  .mockResolvedValue({ position: 30, duration: 240, buffered: 60 })

jest.mock('react-native-track-player', () => ({
  __esModule: true,
  default: {
    setupPlayer: (...args: unknown[]) => mockSetupPlayer(...args),
    updateOptions: (...args: unknown[]) => mockUpdateOptions(...args),
    reset: (...args: unknown[]) => mockReset(...args),
    add: (...args: unknown[]) => mockAdd(...args),
    play: (...args: unknown[]) => mockPlay(...args),
    pause: (...args: unknown[]) => mockPause(...args),
    seekTo: (...args: unknown[]) => mockSeekTo(...args),
    setRate: (...args: unknown[]) => mockSetRate(...args),
    setVolume: (...args: unknown[]) => mockSetVolume(...args),
    getProgress: (...args: unknown[]) => mockGetProgress(...args),
  },
  Capability: {
    Play: 'play',
    Pause: 'pause',
    SeekTo: 'seekTo',
    SkipToNext: 'skipToNext',
    SkipToPrevious: 'skipToPrevious',
  },
  AppKilledPlaybackBehavior: {
    StopPlaybackAndRemoveNotification: 'StopPlaybackAndRemoveNotification',
  },
}))

describe('audioService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('setup', () => {
    it('setupPlayerとupdateOptionsが呼ばれる', async () => {
      await audioService.setup()

      expect(mockSetupPlayer).toHaveBeenCalled()
      expect(mockUpdateOptions).toHaveBeenCalled()
    })
  })

  describe('loadTrack', () => {
    it('resetしてからトラックを追加する', async () => {
      await audioService.loadTrack('/audio/uuid-1.mp3', 'テスト曲')

      expect(mockReset).toHaveBeenCalled()
      expect(mockAdd).toHaveBeenCalledWith({
        id: '/audio/uuid-1.mp3',
        url: '/audio/uuid-1.mp3',
        title: 'テスト曲',
      })
    })
  })

  describe('play', () => {
    it('TrackPlayer.playが呼ばれる', async () => {
      await audioService.play()
      expect(mockPlay).toHaveBeenCalled()
    })
  })

  describe('pause', () => {
    it('TrackPlayer.pauseが呼ばれる', async () => {
      await audioService.pause()
      expect(mockPause).toHaveBeenCalled()
    })
  })

  describe('seekTo', () => {
    it('指定秒にシークする', async () => {
      await audioService.seekTo(120)
      expect(mockSeekTo).toHaveBeenCalledWith(120)
    })

    it('負の値の場合は0にシークする', async () => {
      await audioService.seekTo(-10)
      expect(mockSeekTo).toHaveBeenCalledWith(0)
    })
  })

  describe('setRate', () => {
    it('再生速度を変更する', async () => {
      await audioService.setRate(2.0)
      expect(mockSetRate).toHaveBeenCalledWith(2.0)
    })
  })

  describe('setVolume', () => {
    it('音量を設定する', async () => {
      await audioService.setVolume(0.5)
      expect(mockSetVolume).toHaveBeenCalledWith(0.5)
    })

    it('1を超える値は1にクランプする', async () => {
      await audioService.setVolume(1.5)
      expect(mockSetVolume).toHaveBeenCalledWith(1)
    })

    it('0未満の値は0にクランプする', async () => {
      await audioService.setVolume(-0.5)
      expect(mockSetVolume).toHaveBeenCalledWith(0)
    })
  })

  describe('getProgress', () => {
    it('現在位置と曲の長さを返す', async () => {
      const progress = await audioService.getProgress()
      expect(progress).toEqual({ position: 30, duration: 240 })
    })
  })

  describe('reset', () => {
    it('TrackPlayer.resetが呼ばれる', async () => {
      await audioService.reset()
      expect(mockReset).toHaveBeenCalled()
    })
  })
})
