import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { STORAGE_KEYS } from '../constants/defaults'

interface AudioDeviceState {
  preferredInputUID: string | null
  preferredOutputUID: string | null
  isManuallySet: boolean
}

interface AudioDeviceActions {
  setPreferredInput: (uid: string | null) => void
  setPreferredOutput: (uid: string | null) => void
  resetToAuto: () => void
}

export const useAudioDeviceStore = create<AudioDeviceState & AudioDeviceActions>()(
  persist(
    (set) => ({
      preferredInputUID: null,
      preferredOutputUID: null,
      isManuallySet: false,

      setPreferredInput: (uid) =>
        set({ preferredInputUID: uid, isManuallySet: true }),

      setPreferredOutput: (uid) =>
        set({ preferredOutputUID: uid, isManuallySet: true }),

      resetToAuto: () =>
        set({
          preferredInputUID: null,
          preferredOutputUID: null,
          isManuallySet: false,
        }),
    }),
    {
      name: STORAGE_KEYS.AUDIO_DEVICE,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
