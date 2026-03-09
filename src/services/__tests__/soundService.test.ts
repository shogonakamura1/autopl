import { SoundType } from '../../constants/sounds'

describe('soundService', () => {
  let soundService: typeof import('../soundService')['soundService']
  let mockCreateAudioPlayer: jest.Mock
  let mockSetAudioModeAsync: jest.Mock
  let mockPlayer: { play: jest.Mock; seekTo: jest.Mock; release: jest.Mock }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let localSettingsStore: any

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const expoAudio = require('expo-audio')
    mockCreateAudioPlayer = expoAudio.createAudioPlayer
    mockSetAudioModeAsync = expoAudio.setAudioModeAsync

    mockPlayer = {
      play: jest.fn(),
      seekTo: jest.fn().mockResolvedValue(undefined),
      release: jest.fn(),
    }
    mockCreateAudioPlayer.mockReturnValue(mockPlayer)

    // soundService と同じモジュールインスタンスの settingsStore を使う
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    localSettingsStore = require('../../stores/settingsStore').useSettingsStore
    localSettingsStore.getState().updateSettings({ soundEnabled: true })

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    soundService = require('../soundService').soundService
  })

  describe('preload', () => {
    it('オーディオモードをmixWithOthersで設定してプレイヤーを3つ作成する', async () => {
      await soundService.preload()

      expect(mockSetAudioModeAsync).toHaveBeenCalledWith(
        expect.objectContaining({ interruptionMode: 'mixWithOthers' })
      )
      expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(3)
    })
  })

  describe('play', () => {
    it('soundEnabledがtrueのときseekToとplayが呼ばれる', async () => {
      await soundService.preload()
      await soundService.play(SoundType.WAKEWORD)

      expect(mockPlayer.seekTo).toHaveBeenCalledWith(0)
      expect(mockPlayer.play).toHaveBeenCalled()
    })

    it('soundEnabledがfalseのとき再生しない', async () => {
      localSettingsStore.getState().updateSettings({ soundEnabled: false })

      await soundService.preload()
      await soundService.play(SoundType.WAKEWORD)

      expect(mockPlayer.play).not.toHaveBeenCalled()
    })
  })

  describe('unload', () => {
    it('ロード済みのプレイヤーをreleaseする', async () => {
      await soundService.preload()
      await soundService.unload()

      expect(mockPlayer.release).toHaveBeenCalled()
    })
  })
})
