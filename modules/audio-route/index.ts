import { requireOptionalNativeModule } from 'expo-modules-core'

// ネイティブモジュールが未ビルドの場合は null になる（prebuild 前の開発時など）
const AudioRouteNativeModule = requireOptionalNativeModule('AudioRoute')

export interface AudioPort {
  uid: string
  name: string
  type: string
}

export const getAvailableInputs = (): Promise<AudioPort[]> =>
  AudioRouteNativeModule?.getAvailableInputs() ?? Promise.resolve([])

export const getAvailableOutputs = (): Promise<AudioPort[]> =>
  AudioRouteNativeModule?.getAvailableOutputs() ?? Promise.resolve([])

export const setPreferredInput = (uid: string | null): Promise<void> =>
  AudioRouteNativeModule?.setPreferredInput(uid) ?? Promise.resolve()

export const setPreferredOutput = (uid: string): Promise<void> =>
  AudioRouteNativeModule?.setPreferredOutput(uid) ?? Promise.resolve()

export const getCurrentRoute = (): Promise<{
  inputs: AudioPort[]
  outputs: AudioPort[]
}> =>
  AudioRouteNativeModule?.getCurrentRoute() ??
  Promise.resolve({ inputs: [], outputs: [] })
