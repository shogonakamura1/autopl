import { useEffect, useCallback, useRef } from 'react'
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition'
import NetInfo from '@react-native-community/netinfo'
import { VoiceCommand, VoiceRecognitionState } from '../types'
import { useVoiceStore } from '../stores/voiceStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useAudioDeviceStore } from '../stores/audioDeviceStore'
import * as AudioRoute from '../../modules/audio-route'

interface UseVoiceRecognitionResult {
  recognitionState: VoiceRecognitionState
  isOnline: boolean
  lastRecognizedText: string | null
  hasPermission: boolean | null
  startWakeWordListening: () => void
  stopListening: () => void
  requestPermission: () => Promise<boolean>
}

// expo-speech-recognition の iOS 音声セッション設定
// allowBluetooth:     Bluetooth マイクを使用可能にする（HFP）
// allowBluetoothA2DP: Bluetooth マイク未使用時は A2DP 高音質を維持
// defaultToSpeaker:   Bluetooth 未接続時はスピーカーを使用
// mixWithOthers:      TrackPlayer の再生を中断しない
// mode: 'default'     measurement モードは再生音量を下げるため使わない
const IOS_AUDIO_SESSION_OPTIONS = {
  category: 'playAndRecord' as const,
  categoryOptions: [
    'allowBluetooth',
    'allowBluetoothA2DP',
    'defaultToSpeaker',
    'mixWithOthers',
  ] as ('allowBluetooth' | 'allowBluetoothA2DP' | 'defaultToSpeaker' | 'mixWithOthers')[],
  mode: 'default' as const,
}

export const useVoiceRecognition = (
  onCommandRecognized: (command: VoiceCommand) => void
): UseVoiceRecognitionResult => {
  const recognitionState = useVoiceStore((state) => state.recognitionState)
  const isOnline = useVoiceStore((state) => state.isOnline)
  const lastRecognizedText = useVoiceStore(
    (state) => state.lastRecognizedText
  )
  const setRecognitionState = useVoiceStore(
    (state) => state.setRecognitionState
  )
  const setIsOnline = useVoiceStore((state) => state.setIsOnline)
  const setLastRecognizedText = useVoiceStore(
    (state) => state.setLastRecognizedText
  )

  const wakeWord = useSettingsStore((state) => state.wakeWord)
  const commands = useSettingsStore((state) => state.commands)
  const timeoutSeconds = useSettingsStore((state) => state.timeoutSeconds)

  const hasPermissionRef = useRef<boolean | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isListeningRef = useRef(false)
  const isSessionActiveRef = useRef(false)
  const recognitionStateRef = useRef(recognitionState)
  const isOnlineRef = useRef(isOnline)

  useEffect(() => {
    isOnlineRef.current = isOnline
  }, [isOnline])

  const updateState = useCallback(
    (state: VoiceRecognitionState) => {
      recognitionStateRef.current = state
      setRecognitionState(state)
    },
    [setRecognitionState]
  )

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false)
    })
    return () => unsubscribe()
  }, [setIsOnline])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const result =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync()
      hasPermissionRef.current = result.granted
      return result.granted
    } catch (error) {
      console.error('[useVoiceRecognition] requestPermission failed:', error)
      hasPermissionRef.current = false
      return false
    }
  }, [])

  const matchCommand = useCallback(
    (text: string): VoiceCommand | null => {
      const normalizedText = text.trim().toLowerCase()
      for (const [command, keyword] of Object.entries(commands)) {
        if (normalizedText.includes(keyword.toLowerCase())) {
          return command as VoiceCommand
        }
      }
      return null
    },
    [commands]
  )

  const containsWakeWord = useCallback(
    (text: string): boolean => {
      return text.trim().toLowerCase().includes(wakeWord.toLowerCase())
    },
    [wakeWord]
  )

  const clearCommandTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // 単一の continuous セッションを開始する
  // wakeword → command の遷移で stop/start を繰り返さないことで音楽の途切れを防止する
  const startRecognition = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'ja-JP',
        interimResults: true,
        continuous: true,
        requiresOnDeviceRecognition: !isOnlineRef.current,
        contextualStrings: [wakeWord, ...Object.values(commands)],
        iosCategory: IOS_AUDIO_SESSION_OPTIONS,
      })
    } catch (error) {
      console.error('[useVoiceRecognition] startRecognition failed:', error)
    }
  }, [wakeWord, commands])

  const stopListening = useCallback(() => {
    clearCommandTimeout()
    isListeningRef.current = false
    try {
      ExpoSpeechRecognitionModule.stop()
    } catch {
      // 既に停止している場合のエラーは無視
    }
    updateState(VoiceRecognitionState.IDLE)
    setLastRecognizedText(null)
  }, [clearCommandTimeout, updateState, setLastRecognizedText])

  const startWakeWordListening = useCallback(() => {
    isListeningRef.current = true
    updateState(VoiceRecognitionState.LISTENING_FOR_WAKEWORD)
    startRecognition()
  }, [updateState, startRecognition])

  useEffect(() => {
    // セッション開始イベント:
    // expo-speech-recognition が setCategory + setActive を完了したタイミングで
    // preferredInput を適用する。この時点では allowBluetooth が有効になっているため
    // Bluetooth マイクが availableInputs に現れ、setPreferredInput が成功する
    const startSubscription = ExpoSpeechRecognitionModule.addListener(
      'start',
      () => {
        isSessionActiveRef.current = true
        const { preferredInputUID } = useAudioDeviceStore.getState()
        AudioRoute.setPreferredInput(preferredInputUID).catch((err) => {
          console.error('[useVoiceRecognition] setPreferredInput failed:', err)
        })
      }
    )

    const resultSubscription = ExpoSpeechRecognitionModule.addListener(
      'result',
      (event) => {
        const transcript = event.results[0]?.transcript ?? ''
        if (!transcript) return

        setLastRecognizedText(transcript)

        if (
          recognitionStateRef.current === VoiceRecognitionState.LISTENING_FOR_WAKEWORD
        ) {
          if (containsWakeWord(transcript)) {
            // ウェイクワード検出 → セッションを止めずに状態だけ変更
            // stop/start しないことで音楽の途切れを防止する
            updateState(VoiceRecognitionState.LISTENING_FOR_COMMAND)

            clearCommandTimeout()
            timeoutRef.current = setTimeout(() => {
              if (
                isListeningRef.current &&
                recognitionStateRef.current ===
                  VoiceRecognitionState.LISTENING_FOR_COMMAND
              ) {
                updateState(VoiceRecognitionState.LISTENING_FOR_WAKEWORD)
                setLastRecognizedText(null)
              }
            }, timeoutSeconds * 1000)
          }
        } else if (
          recognitionStateRef.current === VoiceRecognitionState.LISTENING_FOR_COMMAND
        ) {
          const command = matchCommand(transcript)
          if (command) {
            // コマンド検出 → 中間結果でも即座に実行（isFinal 待ち不要）
            clearCommandTimeout()
            updateState(VoiceRecognitionState.PROCESSING)
            onCommandRecognized(command)

            // フィードバック音の後にウェイクワード待機に戻る
            // セッションが PROCESSING 中に終了していた場合は再開する
            setTimeout(() => {
              if (isListeningRef.current) {
                updateState(VoiceRecognitionState.LISTENING_FOR_WAKEWORD)
                setLastRecognizedText(null)
                if (!isSessionActiveRef.current) {
                  startRecognition()
                }
              }
            }, 500)
          }
        }
      }
    )

    const errorSubscription = ExpoSpeechRecognitionModule.addListener(
      'error',
      (event) => {
        if (event.error === 'no-speech' || event.error === 'speech-timeout') {
          // no-speech / speech-timeout はウェイクワード待機中の正常な挙動
          console.warn('[useVoiceRecognition] expected timeout:', event.error)
        } else {
          console.error('[useVoiceRecognition] recognition error:', event.error)
        }
      }
    )

    const endSubscription = ExpoSpeechRecognitionModule.addListener(
      'end',
      () => {
        isSessionActiveRef.current = false

        if (!isListeningRef.current) return

        // セッションが自然終了（iOS 制限 / タイムアウト）→ 再開
        // 状態はリセットしない: LISTENING_FOR_COMMAND 中に end が来ても
        // コマンド待機を継続するため、現在の状態のままセッションを再起動する
        // PROCESSING 中（コマンド実行直後の 500ms）は 500ms コールバックが再開を担う
        setTimeout(() => {
          if (
            isListeningRef.current &&
            recognitionStateRef.current !== VoiceRecognitionState.PROCESSING
          ) {
            startRecognition()
          }
        }, 300)
      }
    )

    return () => {
      startSubscription.remove()
      resultSubscription.remove()
      errorSubscription.remove()
      endSubscription.remove()
    }
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    containsWakeWord,
    matchCommand,
    clearCommandTimeout,
    updateState,
    setLastRecognizedText,
    onCommandRecognized,
    startRecognition,
    timeoutSeconds,
  ])

  useEffect(() => {
    return () => {
      clearCommandTimeout()
      isListeningRef.current = false
      try {
        ExpoSpeechRecognitionModule.stop()
      } catch {
        // クリーンアップ時のエラーは無視
      }
    }
  }, [clearCommandTimeout])

  return {
    recognitionState,
    isOnline,
    lastRecognizedText,
    hasPermission: hasPermissionRef.current,
    startWakeWordListening,
    stopListening,
    requestPermission,
  }
}
