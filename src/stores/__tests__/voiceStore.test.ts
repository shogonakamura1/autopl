import { useVoiceStore } from '../voiceStore'
import { VoiceRecognitionState } from '../../types'

describe('voiceStore', () => {
  beforeEach(() => {
    useVoiceStore.getState().resetVoice()
  })

  describe('setRecognitionState', () => {
    it('認識状態がLISTENING_FOR_WAKEWORDに変更される', () => {
      useVoiceStore
        .getState()
        .setRecognitionState(VoiceRecognitionState.LISTENING_FOR_WAKEWORD)

      expect(useVoiceStore.getState().recognitionState).toBe(
        VoiceRecognitionState.LISTENING_FOR_WAKEWORD
      )
    })

    it('認識状態がLISTENING_FOR_COMMANDに変更される', () => {
      useVoiceStore
        .getState()
        .setRecognitionState(VoiceRecognitionState.LISTENING_FOR_COMMAND)

      expect(useVoiceStore.getState().recognitionState).toBe(
        VoiceRecognitionState.LISTENING_FOR_COMMAND
      )
    })
  })

  describe('setIsOnline', () => {
    it('オフライン状態に変更できる', () => {
      useVoiceStore.getState().setIsOnline(false)
      expect(useVoiceStore.getState().isOnline).toBe(false)
    })

    it('オンライン状態に変更できる', () => {
      useVoiceStore.getState().setIsOnline(false)
      useVoiceStore.getState().setIsOnline(true)
      expect(useVoiceStore.getState().isOnline).toBe(true)
    })
  })

  describe('setLastRecognizedText', () => {
    it('認識テキストが設定される', () => {
      useVoiceStore.getState().setLastRecognizedText('再生')
      expect(useVoiceStore.getState().lastRecognizedText).toBe('再生')
    })

    it('nullでクリアできる', () => {
      useVoiceStore.getState().setLastRecognizedText('再生')
      useVoiceStore.getState().setLastRecognizedText(null)
      expect(useVoiceStore.getState().lastRecognizedText).toBeNull()
    })
  })

  describe('resetVoice', () => {
    it('全ての状態が初期値にリセットされる', () => {
      useVoiceStore
        .getState()
        .setRecognitionState(VoiceRecognitionState.LISTENING_FOR_COMMAND)
      useVoiceStore.getState().setIsOnline(false)
      useVoiceStore.getState().setLastRecognizedText('テスト')

      useVoiceStore.getState().resetVoice()

      const state = useVoiceStore.getState()
      expect(state.recognitionState).toBe(VoiceRecognitionState.IDLE)
      expect(state.isOnline).toBe(true)
      expect(state.lastRecognizedText).toBeNull()
    })
  })
})
