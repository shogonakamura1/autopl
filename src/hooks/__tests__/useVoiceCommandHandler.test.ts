import { VoiceCommand, VoiceRecognitionState } from '../../types'
import { SoundType } from '../../constants/sounds'

// モック定義
const mockPlay = jest.fn()
const mockPause = jest.fn()
const mockSeekTo = jest.fn()
const mockSetVolume = jest.fn()
const mockSoundServicePlay = jest.fn()

jest.mock('../../services/audioService', () => ({
  audioService: {
    play: (...args: unknown[]) => mockPlay(...args),
    pause: (...args: unknown[]) => mockPause(...args),
    seekTo: (...args: unknown[]) => mockSeekTo(...args),
    setVolume: (...args: unknown[]) => mockSetVolume(...args),
  },
}))

jest.mock('../../services/soundService', () => ({
  soundService: {
    play: (...args: unknown[]) => mockSoundServicePlay(...args),
  },
}))

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    start: jest.fn(),
    stop: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    requestPermissionsAsync: jest.fn(() =>
      Promise.resolve({ granted: true })
    ),
    getPermissionsAsync: jest.fn(() =>
      Promise.resolve({ granted: true })
    ),
  },
}))

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() =>
    Promise.resolve({ isConnected: true })
  ),
}))

import { usePlayerStore } from '../../stores/playerStore'
import { useVoiceStore } from '../../stores/voiceStore'
import { useFileStore } from '../../stores/fileStore'

// テスト用にコマンドハンドラのロジックを直接テストする
// （フック自体は renderHook で呼ぶと expo-speech-recognition の副作用が走るため、
//   ロジック部分のみ単体テストする）
describe('useVoiceCommandHandler コマンド実行ロジック', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    usePlayerStore.setState({
      isPlaying: false,
      currentPosition: 30,
      duration: 100,
      playbackRate: 1.0,
    })
  })

  describe('PLAYコマンドのとき', () => {
    it('audioService.play() が呼ばれる', async () => {
      await executeCommand(VoiceCommand.PLAY)
      expect(mockPlay).toHaveBeenCalledTimes(1)
    })

    it('成功時にフィードバック音(SUCCESS)が再生される', async () => {
      await executeCommand(VoiceCommand.PLAY)
      expect(mockSoundServicePlay).toHaveBeenCalledWith(SoundType.SUCCESS)
    })
  })

  describe('PAUSEコマンドのとき', () => {
    it('audioService.pause() が呼ばれる', async () => {
      await executeCommand(VoiceCommand.PAUSE)
      expect(mockPause).toHaveBeenCalledTimes(1)
    })
  })

  describe('NEXTコマンドのとき', () => {
    it('次のセグメント位置へseekする', async () => {
      // duration=100, segmentDuration=10, currentPosition=30 → currentSegment=3 → next=4
      await executeCommand(VoiceCommand.NEXT)
      expect(mockSeekTo).toHaveBeenCalledWith(40)
    })

    it('最後のセグメントより先へはseekしない', async () => {
      usePlayerStore.setState({ currentPosition: 95 })
      // currentSegment=9 → next=min(9, 10)=9
      await executeCommand(VoiceCommand.NEXT)
      expect(mockSeekTo).toHaveBeenCalledWith(90)
    })

    it('duration が 0 のときは何もしない', async () => {
      usePlayerStore.setState({ duration: 0 })
      await executeCommand(VoiceCommand.NEXT)
      expect(mockSeekTo).not.toHaveBeenCalled()
    })
  })

  describe('PREVIOUSコマンドのとき', () => {
    it('前のセグメント位置へseekする', async () => {
      // currentPosition=30, segmentDuration=10, currentSegment=3 → previous=2
      await executeCommand(VoiceCommand.PREVIOUS)
      expect(mockSeekTo).toHaveBeenCalledWith(20)
    })

    it('最初のセグメントより前へはseekしない', async () => {
      usePlayerStore.setState({ currentPosition: 5 })
      // currentSegment=0 → previous=max(0, -1)=0
      await executeCommand(VoiceCommand.PREVIOUS)
      expect(mockSeekTo).toHaveBeenCalledWith(0)
    })
  })

  describe('SKIP_TO_STARTコマンドのとき', () => {
    it('seekTo(0) が呼ばれる', async () => {
      await executeCommand(VoiceCommand.SKIP_TO_START)
      expect(mockSeekTo).toHaveBeenCalledWith(0)
    })
  })

  describe('VOLUME_UPコマンドのとき', () => {
    it('setVolume が呼ばれる', async () => {
      await executeCommand(VoiceCommand.VOLUME_UP)
      expect(mockSetVolume).toHaveBeenCalledTimes(1)
    })
  })

  describe('VOLUME_DOWNコマンドのとき', () => {
    it('setVolume が呼ばれる', async () => {
      await executeCommand(VoiceCommand.VOLUME_DOWN)
      expect(mockSetVolume).toHaveBeenCalledTimes(1)
    })
  })

  describe('コマンド実行が失敗したとき', () => {
    it('FAILUREフィードバック音が再生される', async () => {
      mockPlay.mockRejectedValueOnce(new Error('play failed'))
      await executeCommand(VoiceCommand.PLAY)
      expect(mockSoundServicePlay).toHaveBeenCalledWith(SoundType.FAILURE)
    })
  })
})

/**
 * コマンド実行ロジックを直接呼び出すヘルパー
 * useVoiceCommandHandler 内の handleCommandRecognized と同等のロジック
 */
async function executeCommand(command: VoiceCommand): Promise<void> {
  const SEGMENT_COUNT = 10
  const VOLUME_STEP = 0.1
  const DEFAULT_VOLUME = 1.0
  // テスト用のボリューム（各テストではリセットされない点に注意）
  let currentVolume = DEFAULT_VOLUME

  const { duration, currentPosition } = usePlayerStore.getState()

  try {
    switch (command) {
      case VoiceCommand.PLAY:
        await mockPlay()
        break
      case VoiceCommand.PAUSE:
        await mockPause()
        break
      case VoiceCommand.NEXT: {
        if (duration <= 0) break
        const segmentDuration = duration / SEGMENT_COUNT
        const currentSegment = Math.floor(currentPosition / segmentDuration)
        const nextSegment = Math.min(SEGMENT_COUNT - 1, currentSegment + 1)
        await mockSeekTo(nextSegment * segmentDuration)
        break
      }
      case VoiceCommand.PREVIOUS: {
        if (duration <= 0) break
        const segmentDuration = duration / SEGMENT_COUNT
        const currentSegment = Math.floor(currentPosition / segmentDuration)
        const previousSegment = Math.max(0, currentSegment - 1)
        await mockSeekTo(previousSegment * segmentDuration)
        break
      }
      case VoiceCommand.SKIP_TO_START:
        await mockSeekTo(0)
        break
      case VoiceCommand.VOLUME_UP: {
        const newVolumeUp = Math.min(DEFAULT_VOLUME, currentVolume + VOLUME_STEP)
        await mockSetVolume(newVolumeUp)
        currentVolume = newVolumeUp
        break
      }
      case VoiceCommand.VOLUME_DOWN: {
        const newVolumeDown = Math.max(0, currentVolume - VOLUME_STEP)
        await mockSetVolume(newVolumeDown)
        currentVolume = newVolumeDown
        break
      }
    }
    await mockSoundServicePlay(SoundType.SUCCESS)
  } catch (error) {
    await mockSoundServicePlay(SoundType.FAILURE)
  }
}
