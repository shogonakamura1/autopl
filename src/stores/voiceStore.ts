import { create } from 'zustand'
import { VoiceRecognitionState } from '../types'

interface VoiceState {
  recognitionState: VoiceRecognitionState
  isOnline: boolean
  lastRecognizedText: string | null
  hasMicPermission: boolean
}

interface VoiceActions {
  setRecognitionState: (state: VoiceRecognitionState) => void
  setIsOnline: (isOnline: boolean) => void
  setLastRecognizedText: (text: string | null) => void
  setHasMicPermission: (hasPermission: boolean) => void
  resetVoice: () => void
}

type VoiceStore = VoiceState & VoiceActions

const INITIAL_VOICE_STATE: VoiceState = {
  recognitionState: VoiceRecognitionState.IDLE,
  isOnline: true,
  lastRecognizedText: null,
  hasMicPermission: true,
}

export const useVoiceStore = create<VoiceStore>()((set) => ({
  ...INITIAL_VOICE_STATE,

  setRecognitionState: (recognitionState: VoiceRecognitionState) => {
    set({ recognitionState })
  },

  setIsOnline: (isOnline: boolean) => {
    set({ isOnline })
  },

  setLastRecognizedText: (text: string | null) => {
    set({ lastRecognizedText: text })
  },

  setHasMicPermission: (hasPermission: boolean) => {
    set({ hasMicPermission: hasPermission })
  },

  resetVoice: () => {
    set(INITIAL_VOICE_STATE)
  },
}))
