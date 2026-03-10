import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'
import * as AudioRoute from '../../modules/audio-route'
import type { AudioPort } from '../../modules/audio-route'
import { useAudioDeviceStore } from '../stores/audioDeviceStore'

// モジュールレベルキャッシュ: 設定画面を開いた際に即座に表示するため
// アプリ起動中はメモリに保持し、2回目以降の画面表示でラグをなくす
let _deviceCache: { inputs: AudioPort[]; outputs: AudioPort[] } = {
  inputs: [],
  outputs: [],
}

export const useAudioDeviceRoute = () => {
  const [availableInputs, setAvailableInputs] = useState<AudioPort[]>(_deviceCache.inputs)
  const [availableOutputs, setAvailableOutputs] = useState<AudioPort[]>(_deviceCache.outputs)

  const preferredInputUID = useAudioDeviceStore((state) => state.preferredInputUID)
  const preferredOutputUID = useAudioDeviceStore((state) => state.preferredOutputUID)
  const isManuallySet = useAudioDeviceStore((state) => state.isManuallySet)
  const storeSetPreferredInput = useAudioDeviceStore((state) => state.setPreferredInput)
  const storeSetPreferredOutput = useAudioDeviceStore((state) => state.setPreferredOutput)

  const refreshDevices = useCallback(async () => {
    try {
      const [inputs, outputs] = await Promise.all([
        AudioRoute.getAvailableInputs(),
        AudioRoute.getAvailableOutputs(),
      ])

      // Bluetooth デバイスは入出力両対応のため、両方のピッカーに表示する（#63）
      // ユーザーがマイクとしてもスピーカーとしても選択できるようにする
      const bluetoothTypes = ['BluetoothHFP', 'BluetoothA2DPOutput', 'BluetoothLE']
      const isBluetooth = (device: AudioPort) =>
        bluetoothTypes.includes(device.type)

      const mergedInputs = [...inputs]
      for (const device of outputs.filter(isBluetooth)) {
        if (!mergedInputs.some((d) => d.uid === device.uid)) {
          mergedInputs.push(device)
        }
      }

      const mergedOutputs = [...outputs]
      for (const device of inputs.filter(isBluetooth)) {
        if (!mergedOutputs.some((d) => d.uid === device.uid)) {
          mergedOutputs.push(device)
        }
      }

      _deviceCache = { inputs: mergedInputs, outputs: mergedOutputs }
      setAvailableInputs(mergedInputs)
      setAvailableOutputs(mergedOutputs)
    } catch (error) {
      console.error('[useAudioDeviceRoute] refreshDevices failed:', error)
    }
  }, [])

  const applyPreferences = useCallback(async () => {
    try {
      await AudioRoute.setPreferredInput(preferredInputUID)
      if (preferredOutputUID) {
        await AudioRoute.setPreferredOutput(preferredOutputUID)
      }
    } catch (error) {
      console.error('[useAudioDeviceRoute] applyPreferences failed:', error)
    }
  }, [preferredInputUID, preferredOutputUID])

  // マウント時はデバイス一覧の取得のみ行う
  // applyPreferences はユーザーがデバイスを変更したとき
  // または音声認識の start イベントで適用される
  // 設定画面を開くだけで setCategory が走り音楽が途切れるのを防ぐ
  useEffect(() => {
    refreshDevices()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // フォアグラウンド復帰時にデバイス一覧を再スキャン
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshDevices()
      }
    })
    return () => subscription.remove()
  }, [refreshDevices])

  const selectInput = useCallback(
    async (uid: string) => {
      try {
        // 選択されたデバイスの名前を取得して保存（プロファイル切替時のフォールバック用）
        const device = availableInputs.find((d) => d.uid === uid)
        await AudioRoute.setPreferredInput(uid, device?.name)
        storeSetPreferredInput(uid, device?.name)
      } catch (error) {
        console.error('[useAudioDeviceRoute] selectInput failed:', error)
      }
    },
    [storeSetPreferredInput, availableInputs]
  )

  const selectOutput = useCallback(
    async (uid: string) => {
      try {
        await AudioRoute.setPreferredOutput(uid)
        storeSetPreferredOutput(uid)
      } catch (error) {
        console.error('[useAudioDeviceRoute] selectOutput failed:', error)
      }
    },
    [storeSetPreferredOutput]
  )

  return {
    availableInputs,
    availableOutputs,
    preferredInputUID,
    preferredOutputUID,
    isManuallySet,
    selectInput,
    selectOutput,
    refreshDevices,
  }
}
