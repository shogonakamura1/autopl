import { useEffect, useCallback, useRef } from 'react'
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition'
import NetInfo from '@react-native-community/netinfo'
import { VoiceCommand, VoiceRecognitionState } from '../types'
import { useVoiceStore } from '../stores/voiceStore'
import { useSettingsStore } from '../stores/settingsStore'

interface UseVoiceRecognitionResult {
  recognitionState: VoiceRecognitionState
  isOnline: boolean
  lastRecognizedText: string | null
  hasPermission: boolean | null
  startWakeWordListening: () => void
  stopListening: () => void
  requestPermission: () => Promise<boolean>
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

  // ネットワーク状態の監視
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false)
    })
    return () => unsubscribe()
  }, [setIsOnline])

  // 権限チェック
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

  // 認識テキストからコマンドを解析
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

  // ウェイクワード検出チェック
  const containsWakeWord = useCallback(
    (text: string): boolean => {
      return text.trim().toLowerCase().includes(wakeWord.toLowerCase())
    },
    [wakeWord]
  )

  // タイムアウトをクリア
  const clearCommandTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // 音声認識を停止
  const stopListening = useCallback(() => {
    clearCommandTimeout()
    isListeningRef.current = false
    try {
      ExpoSpeechRecognitionModule.stop()
    } catch {
      // 既に停止している場合のエラーは無視
    }
    setRecognitionState(VoiceRecognitionState.IDLE)
    setLastRecognizedText(null)
  }, [clearCommandTimeout, setRecognitionState, setLastRecognizedText])

  // コマンド認識を開始する（ウェイクワード検出後）
  const startCommandListening = useCallback(() => {
    setRecognitionState(VoiceRecognitionState.LISTENING_FOR_COMMAND)
    clearCommandTimeout()

    // タイムアウト設定
    timeoutRef.current = setTimeout(() => {
      setRecognitionState(VoiceRecognitionState.IDLE)
      setLastRecognizedText(null)
      // ウェイクワード検出に戻る
      if (isListeningRef.current) {
        startWakeWordRecognition()
      }
    }, timeoutSeconds * 1000)

    startRecognition(false)
  }, [timeoutSeconds, clearCommandTimeout, setRecognitionState, setLastRecognizedText]) // eslint-disable-line react-hooks/exhaustive-deps

  // 音声認識を実行する
  const startRecognition = useCallback(
    (continuous: boolean) => {
      try {
        ExpoSpeechRecognitionModule.start({
          lang: 'ja-JP',
          interimResults: true,
          continuous,
          requiresOnDeviceRecognition: !isOnline,
          contextualStrings: [wakeWord, ...Object.values(commands)],
        })
      } catch (error) {
        console.error('[useVoiceRecognition] startRecognition failed:', error)
      }
    },
    [isOnline, wakeWord, commands]
  )

  // ウェイクワード検出用の認識を開始する
  const startWakeWordRecognition = useCallback(() => {
    setRecognitionState(VoiceRecognitionState.LISTENING_FOR_WAKEWORD)
    startRecognition(true)
  }, [setRecognitionState, startRecognition])

  // ウェイクワード監視を開始（外部API）
  const startWakeWordListening = useCallback(() => {
    isListeningRef.current = true
    startWakeWordRecognition()
  }, [startWakeWordRecognition])

  // 音声認識イベントリスナー
  useEffect(() => {
    const resultSubscription = ExpoSpeechRecognitionModule.addListener(
      'result',
      (event) => {
        const transcript = event.results[0]?.transcript ?? ''
        if (!transcript) return

        setLastRecognizedText(transcript)

        if (
          recognitionState === VoiceRecognitionState.LISTENING_FOR_WAKEWORD
        ) {
          if (containsWakeWord(transcript)) {
            ExpoSpeechRecognitionModule.stop()
            startCommandListening()
          }
        } else if (
          recognitionState === VoiceRecognitionState.LISTENING_FOR_COMMAND
        ) {
          const command = matchCommand(transcript)
          if (command && event.isFinal) {
            clearCommandTimeout()
            ExpoSpeechRecognitionModule.stop()
            setRecognitionState(VoiceRecognitionState.PROCESSING)
            onCommandRecognized(command)

            // コマンド実行後、ウェイクワード検出に戻る
            setTimeout(() => {
              if (isListeningRef.current) {
                startWakeWordRecognition()
              }
            }, 500)
          }
        }
      }
    )

    const errorSubscription = ExpoSpeechRecognitionModule.addListener(
      'error',
      (event) => {
        console.error('[useVoiceRecognition] recognition error:', event.error)
        // no-speech や speech-timeout の場合はリトライ
        if (
          isListeningRef.current &&
          (event.error === 'no-speech' || event.error === 'speech-timeout')
        ) {
          setTimeout(() => {
            if (isListeningRef.current) {
              startWakeWordRecognition()
            }
          }, 1000)
        }
      }
    )

    const endSubscription = ExpoSpeechRecognitionModule.addListener(
      'end',
      () => {
        // 認識が終了した場合、ウェイクワードモードなら再開
        if (
          isListeningRef.current &&
          recognitionState === VoiceRecognitionState.LISTENING_FOR_WAKEWORD
        ) {
          setTimeout(() => {
            if (isListeningRef.current) {
              startWakeWordRecognition()
            }
          }, 300)
        }
      }
    )

    return () => {
      resultSubscription.remove()
      errorSubscription.remove()
      endSubscription.remove()
    }
  }, [
    recognitionState,
    containsWakeWord,
    matchCommand,
    startCommandListening,
    startWakeWordRecognition,
    clearCommandTimeout,
    setRecognitionState,
    setLastRecognizedText,
    onCommandRecognized,
  ])

  // クリーンアップ
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
