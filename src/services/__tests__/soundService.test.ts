import { SoundType } from '../../constants/sounds'
import { useSettingsStore } from '../../stores/settingsStore'

const mockPlayAsync = jest.fn().mockResolvedValue(undefined)
const mockSetPositionAsync = jest.fn().mockResolvedValue(undefined)
const mockUnloadAsync = jest.fn().mockResolvedValue(undefined)
const mockCreateAsync = jest.fn().mockResolvedValue({
  sound: {
    playAsync: mockPlayAsync,
    setPositionAsync: mockSetPositionAsync,
    unloadAsync: mockUnloadAsync,
  },
})
const mockSetAudioModeAsync = jest.fn().mockResolvedValue(undefined)

jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: (...args: unknown[]) => mockCreateAsync(...args),
    },
    setAudioModeAsync: (...args: unknown[]) => mockSetAudioModeAsync(...args),
  },
  InterruptionModeIOS: { MixWithOthers: 0 },
  InterruptionModeAndroid: { DuckOthers: 1 },
}))

// soundService はモック設定後にインポートして最新状態を参照させる
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { soundService } = require('../soundService') as typeof import('../soundService')

describe('soundService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useSettingsStore.getState().updateSettings({ soundEnabled: true })
  })

  describe('preload', () => {
    it('オーディオモードをMixWithOthersで設定してサウンドをロードする', async () => {
      await soundService.preload()

      expect(mockSetAudioModeAsync).toHaveBeenCalledWith(
        expect.objectContaining({ playsInSilentModeIOS: true })
      )
      expect(mockCreateAsync).toHaveBeenCalledTimes(3)
    })
  })

  describe('play', () => {
    it('soundEnabledがtrueのとき再生する', async () => {
      await soundService.preload()
      await soundService.play(SoundType.WAKEWORD)

      expect(mockSetPositionAsync).toHaveBeenCalledWith(0)
      expect(mockPlayAsync).toHaveBeenCalled()
    })

    it('soundEnabledがfalseのとき再生しない', async () => {
      useSettingsStore.getState().updateSettings({ soundEnabled: false })

      await soundService.preload()
      await soundService.play(SoundType.WAKEWORD)

      expect(mockPlayAsync).not.toHaveBeenCalled()
    })
  })

  describe('unload', () => {
    it('ロード済みのサウンドをアンロードする', async () => {
      await soundService.preload()
      await soundService.unload()

      expect(mockUnloadAsync).toHaveBeenCalledTimes(3)
    })
  })
})
