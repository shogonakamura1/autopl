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

// expo-speech-recognition の iOS 音声セッション設定
// allowBluetoothA2DP: Bluetooth を A2DP（高音質）のまま維持し HFP 切り替えを防止
// defaultToSpeaker: Bluetooth 未接続時はスピーカーを使用
// mixWithOthers: TrackPlayer の再生を中断しない
// mode: 'default'（measurement モードは再生音量を下げるため使わない）
const IOS_AUDIO_SESSION_OPTIONS = {
  category: 'playAndRecord' as const,
  categoryOptions: [
    'allowBluetoothA2DP',
    'defaultToSpeaker',
    'mixWithOthers',
  ] as ('allowBluetoothA2DP' | 'defaultToSpeaker' | 'mixWithOthers')[],
  mode: 'default' as const,
}

type PendingTransition = 'command' | null

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
  const recognitionStateRef = useRef(recognitionState)
  const pendingTransitionRef = useRef<PendingTransition>(null)
  const isOnlineRef = useRef(isOnline)

  // isOnlineRef を最新値に同期
  useEffect(() => {
    isOnlineRef.current = isOnline
  }, [isOnline])

  // 状態を ref と store の両方に同期的に更新する
  // useEffect 経由の ref 更新はレンダリング後まで遅延し、
  // end イベントが古い state を参照するレースコンディションの原因になるため、
  // 全ての状態変更はこのヘルパーを通す
  const updateState = useCallback(
    (state: VoiceRecognitionState) => {
      recognitionStateRef.current = state
      setRecognitionState(state)
    },
    [setRecognitionState]
  )

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
    pendingTransitionRef.current = null
    isListeningRef.current = false
    try {
      ExpoSpeechRecognitionModule.stop()
    } catch {
      // 既に停止している場合のエラーは無視
    }
    updateState(VoiceRecognitionState.IDLE)
    setLastRecognizedText(null)
  }, [clearCommandTimeout, updateState, setLastRecognizedText])

  // 音声認識を実行する
  const startRecognition = useCallback(
    (continuous: boolean) => {
      try {
        const startOptions = {
          lang: 'ja-JP',
          interimResults: true,
          continuous,
          requiresOnDeviceRecognition: !isOnlineRef.current,
          contextualStrings: [wakeWord, ...Object.values(commands)],
          // iOS の音声セッション設定を明示的に指定
          // デフォルトの allowBluetooth（HFP）と measurement モードを上書きし、
          // A2DP 高音質を維持しつつ再生音量の低下を防ぐ
          iosCategory: IOS_AUDIO_SESSION_OPTIONS,
        }
        ExpoSpeechRecognitionModule.start(startOptions)
      } catch (error) {
        console.error('[useVoiceRecognition] startRecognition failed:', error)
      }
    },
    [wakeWord, commands]
  )

  // ウェイクワード検出用の認識を開始する
  const startWakeWordRecognition = useCallback(() => {
    updateState(VoiceRecognitionState.LISTENING_FOR_WAKEWORD)
    startRecognition(true)
  }, [updateState, startRecognition])

  // コマンド認識を開始する（end イベントから呼ばれる）
  const startCommandRecognition = useCallback(() => {
    updateState(VoiceRecognitionState.LISTENING_FOR_COMMAND)
    clearCommandTimeout()

    // タイムアウト設定
    timeoutRef.current = setTimeout(() => {
      updateState(VoiceRecognitionState.IDLE)
      setLastRecognizedText(null)
      // ウェイクワード検出に戻る
      if (isListeningRef.current) {
        startWakeWordRecognition()
      }
    }, timeoutSeconds * 1000)

    startRecognition(false)
  }, [timeoutSeconds, clearCommandTimeout, updateState, setLastRecognizedText, startWakeWordRecognition, startRecognition])

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
          recognitionStateRef.current === VoiceRecognitionState.LISTENING_FOR_WAKEWORD
        ) {
          if (containsWakeWord(transcript)) {
            // ウェイクワード検出 → 認識を停止し、end イベントでコマンド認識に遷移
            // stop() の前に遷移予約することで、end イベントが正しくコマンド認識を開始する
            pendingTransitionRef.current = 'command'
            ExpoSpeechRecognitionModule.stop()
          }
        } else if (
          recognitionStateRef.current === VoiceRecognitionState.LISTENING_FOR_COMMAND
        ) {
          const command = matchCommand(transcript)
          if (command && event.isFinal) {
            clearCommandTimeout()
            ExpoSpeechRecognitionModule.stop()
            updateState(VoiceRecognitionState.PROCESSING)
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
        if (event.error === 'no-speech' || event.error === 'speech-timeout') {
          // no-speech / speech-timeout はウェイクワード待機中の正常な挙動
          // end イベントが後に発火するのでここではリトライしない（二重起動防止）
          console.warn('[useVoiceRecognition] expected timeout:', event.error)
        } else {
          console.error('[useVoiceRecognition] recognition error:', event.error)
        }
      }
    )

    const endSubscription = ExpoSpeechRecognitionModule.addListener(
      'end',
      () => {
        // 全ての認識再開はここで一元管理する（二重起動を防止）
        const transition = pendingTransitionRef.current
        pendingTransitionRef.current = null

        if (transition === 'command') {
          // ウェイクワード検出後 → コマンド認識を開始
          // stop() の完了を待ってから start() するので iOS の認識セッション競合を回避
          startCommandRecognition()
          return
        }

        // ウェイクワード待機中の自動再開（タイムアウト後など）
        if (
          isListeningRef.current &&
          recognitionStateRef.current === VoiceRecognitionState.LISTENING_FOR_WAKEWORD
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
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    containsWakeWord,
    matchCommand,
    startCommandRecognition,
    startWakeWordRecognition,
    clearCommandTimeout,
    updateState,
    setLastRecognizedText,
    onCommandRecognized,
  ])

  // クリーンアップ
  useEffect(() => {
    return () => {
      clearCommandTimeout()
      pendingTransitionRef.current = null
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
