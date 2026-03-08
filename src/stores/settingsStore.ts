import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CommandMap, Settings } from '../types'
import {
  DEFAULT_WAKE_WORD,
  DEFAULT_COMMANDS,
  DEFAULT_TIMEOUT_SECONDS,
  DEFAULT_SOUND_ENABLED,
  STORAGE_KEYS,
} from '../constants/defaults'

interface SettingsState {
  wakeWord: string
  commands: CommandMap
  timeoutSeconds: number
  soundEnabled: boolean
  onboardingDone: boolean
}

interface SettingsActions {
  updateSettings: (settings: Partial<Settings>) => void
  resetSettings: () => void
}

type SettingsStore = SettingsState & SettingsActions

const INITIAL_SETTINGS_STATE: SettingsState = {
  wakeWord: DEFAULT_WAKE_WORD,
  commands: DEFAULT_COMMANDS,
  timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
  soundEnabled: DEFAULT_SOUND_ENABLED,
  onboardingDone: false,
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...INITIAL_SETTINGS_STATE,

      updateSettings: (settings: Partial<Settings>) => {
        set((state) => ({ ...state, ...settings }))
      },

      resetSettings: () => {
        set(INITIAL_SETTINGS_STATE)
      },
    }),
    {
      name: STORAGE_KEYS.SETTINGS,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        wakeWord: state.wakeWord,
        commands: state.commands,
        timeoutSeconds: state.timeoutSeconds,
        soundEnabled: state.soundEnabled,
        onboardingDone: state.onboardingDone,
      }),
    }
  )
)
