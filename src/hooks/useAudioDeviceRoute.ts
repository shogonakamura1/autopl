import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'
import * as AudioRoute from '../../modules/audio-route'
import type { AudioPort } from '../../modules/audio-route'
import { useAudioDeviceStore } from '../stores/audioDeviceStore'

export const useAudioDeviceRoute = () => {
  const [availableInputs, setAvailableInputs] = useState<AudioPort[]>([])
  const [availableOutputs, setAvailableOutputs] = useState<AudioPort[]>([])

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
      setAvailableInputs(inputs)
      setAvailableOutputs(outputs)
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

  useEffect(() => {
    refreshDevices()
    applyPreferences()
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
        await AudioRoute.setPreferredInput(uid)
        storeSetPreferredInput(uid)
      } catch (error) {
        console.error('[useAudioDeviceRoute] selectInput failed:', error)
      }
    },
    [storeSetPreferredInput]
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
