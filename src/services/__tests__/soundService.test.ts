import { soundService } from '../soundService'
import { SoundType } from '../../constants/sounds'
import { useSettingsStore } from '../../stores/settingsStore'

// react-native-track-player をモック
const mockAdd = jest.fn().mockResolvedValue(undefined)
const mockSkip = jest.fn().mockResolvedValue(undefined)
const mockRemove = jest.fn().mockResolvedValue(undefined)
const mockSeekTo = jest.fn().mockResolvedValue(undefined)
const mockGetQueue = jest.fn().mockResolvedValue([])
const mockGetActiveTrackIndex = jest.fn().mockResolvedValue(undefined)
const mockGetProgress = jest.fn().mockResolvedValue({ position: 0, duration: 0, buffered: 0 })

const mockPlay = jest.fn().mockResolvedValue(undefined)
const mockAddEventListener = jest.fn().mockImplementation((_event: unknown, callback: () => void) => {
  // 即座にイベント発火して再生完了を通知
  Promise.resolve().then(() => callback())
  return { remove: jest.fn() }
})

jest.mock('react-native-track-player', () => ({
  __esModule: true,
  default: {
    add: (...args: unknown[]) => mockAdd(...args),
    skip: (...args: unknown[]) => mockSkip(...args),
    play: (...args: unknown[]) => mockPlay(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
    seekTo: (...args: unknown[]) => mockSeekTo(...args),
    getQueue: () => mockGetQueue(),
    getActiveTrackIndex: () => mockGetActiveTrackIndex(),
    getProgress: () => mockGetProgress(),
    addEventListener: (...args: unknown[]) => mockAddEventListener(...args),
  },
  Event: {
    PlaybackQueueEnded: 'playback-queue-ended',
  },
}))

describe('soundService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useSettingsStore.getState().updateSettings({ soundEnabled: true })
  })

  describe('preload', () => {
    it('TrackPlayerではプリロード不要のため何もしない', async () => {
      await soundService.preload()
      expect(mockAdd).not.toHaveBeenCalled()
    })
  })

  describe('play', () => {
    it('soundEnabledがfalseのとき再生しない', async () => {
      useSettingsStore.getState().updateSettings({ soundEnabled: false })

      await soundService.play(SoundType.WAKEWORD)

      expect(mockAdd).not.toHaveBeenCalled()
      expect(mockPlay).not.toHaveBeenCalled()
    })
  })

  describe('unload', () => {
    it('TrackPlayerではアンロード不要のため何もしない', async () => {
      await soundService.unload()
      expect(mockRemove).not.toHaveBeenCalled()
    })
  })
})
