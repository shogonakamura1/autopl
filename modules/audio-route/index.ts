import { requireNativeModule } from 'expo-modules-core'

const AudioRouteNativeModule = requireNativeModule('AudioRoute')

export interface AudioPort {
  uid: string
  name: string
  type: string
}

export const getAvailableInputs = (): Promise<AudioPort[]> =>
  AudioRouteNativeModule.getAvailableInputs()

export const getAvailableOutputs = (): Promise<AudioPort[]> =>
  AudioRouteNativeModule.getAvailableOutputs()

export const setPreferredInput = (uid: string | null): Promise<void> =>
  AudioRouteNativeModule.setPreferredInput(uid)

export const setPreferredOutput = (uid: string): Promise<void> =>
  AudioRouteNativeModule.setPreferredOutput(uid)

export const getCurrentRoute = (): Promise<{
  inputs: AudioPort[]
  outputs: AudioPort[]
}> => AudioRouteNativeModule.getCurrentRoute()
