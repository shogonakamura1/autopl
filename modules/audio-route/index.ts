import {
  requireOptionalNativeModule,
  EventEmitter,
} from 'expo-modules-core'

// ネイティブモジュールが未ビルドの場合は null になる（prebuild 前の開発時など）
const AudioRouteNativeModule = requireOptionalNativeModule('AudioRoute')

// イベントエミッター（ルート変更通知の購読用）
const emitter = AudioRouteNativeModule
  ? new EventEmitter(AudioRouteNativeModule)
  : null

export interface AudioPort {
  uid: string
  name: string
  type: string
}

export interface AudioRouteChangeEvent {
  reason: string
}

export const getAvailableInputs = (): Promise<AudioPort[]> =>
  AudioRouteNativeModule?.getAvailableInputs() ?? Promise.resolve([])

export const getAvailableOutputs = (): Promise<AudioPort[]> =>
  AudioRouteNativeModule?.getAvailableOutputs() ?? Promise.resolve([])

export const setPreferredInput = (
  uid: string | null,
  name?: string | null
): Promise<void> =>
  AudioRouteNativeModule?.setPreferredInput(uid, name ?? null) ??
  Promise.resolve()

export const setPreferredOutput = (uid: string): Promise<void> =>
  AudioRouteNativeModule?.setPreferredOutput(uid) ?? Promise.resolve()

// 音声認識開始前に audio session を設定し Bluetooth マイクを preferred input にする（#65）
// expo-speech-recognition の start() 前に呼ぶことで、AVAudioEngine が
// 正しい Bluetooth 入力デバイスをキャプチャする
export const prepareSessionForRecognition = (
  uid: string | null,
  name?: string | null
): Promise<void> =>
  AudioRouteNativeModule?.prepareSessionForRecognition(uid, name ?? null) ??
  Promise.resolve()

export const getCurrentRoute = (): Promise<{
  inputs: AudioPort[]
  outputs: AudioPort[]
}> =>
  AudioRouteNativeModule?.getCurrentRoute() ??
  Promise.resolve({ inputs: [], outputs: [] })

// オーディオルート変更イベントの購読（#67）
// TrackPlayer の再生開始、Bluetooth デバイスの接続/切断 等で発火する
export const addRouteChangeListener = (
  callback: (event: AudioRouteChangeEvent) => void
): { remove: () => void } | null => {
  if (!emitter) return null
  return emitter.addListener(
    'onAudioRouteChange' as never,
    callback as never
  )
}
