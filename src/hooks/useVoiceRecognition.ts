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

// expo-speech-recognition の iOS 音声セッション設定を動的に構築する（#67）
// Bluetooth マイク選択時は defaultToSpeaker を除外する。
// HFP は入出力同期プロトコルであり、defaultToSpeaker が出力を内蔵スピーカーに
// 強制すると iOS が HFP 同期を維持できず setPreferredInput を無視する。
// ref: Apple Developer Forums #713197, #730600
type IosCategoryOption = 'allowBluetooth' | 'allowBluetoothA2DP' | 'defaultToSpeaker' | 'mixWithOthers'

const buildIosCategoryOptions = (isBluetoothMic: boolean) => {
  const options: IosCategoryOption[] = [
    'allowBluetooth',
    'allowBluetoothA2DP',
    'mixWithOthers',
  ]
  // Bluetooth マイク未選択時のみ defaultToSpeaker を含める
  // Bluetooth マイク選択時は HFP の入出力同期を維持するため除外
  if (!isBluetoothMic) {
    options.push('defaultToSpeaker')
  }
  return {
    category: 'playAndRecord' as const,
    categoryOptions: options,
    mode: 'default' as const,
  }
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
  // ウェイクワード検出時のトランスクリプトを記録し、
  // コマンドマッチング時は新しいテキストのみを対象にする（#63）
  // continuous モードでトランスクリプトが蓄積されると、前回のコマンド（例: 「再生」）が
  // 残り続け、常に PLAY がマッチする問題を防ぐ
  const wakeWordTranscriptRef = useRef('')

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

  const startRecognition = useCallback(async () => {
    try {
      // Bluetooth マイクルーティングの根本修正（#65, #67）
      // expo-speech-recognition は内部で:
      //   1. setCategory + setActive
      //   2. AVAudioEngine() → inputNode が「この時点の」入力をキャプチャ
      //   3. engine.start()
      //   4. startHandler() 発火
      // のため、start() 前に audio session を設定して preferred input を適用する必要がある。
      // 同じ category を先に設定しておくと expo-speech-recognition 側は no-op になり、
      // AVAudioEngine 作成時に正しい Bluetooth 入力がキャプチャされる。
      const { preferredInputUID, preferredInputName } =
        useAudioDeviceStore.getState()

      // Bluetooth マイクかどうかを判定（#67）
      // preferredInputName が存在する場合は Bluetooth デバイス（内蔵マイクは除外済み）
      const isBluetoothMic = !!preferredInputUID && !!preferredInputName

      if (preferredInputUID) {
        await AudioRoute.prepareSessionForRecognition(
          preferredInputUID,
          preferredInputName
        )
      }

      // iosCategory を動的に構築（#67）
      // Bluetooth マイク選択時は defaultToSpeaker を除外し、HFP 入出力同期を維持
      const iosCategory = buildIosCategoryOptions(isBluetoothMic)

      ExpoSpeechRecognitionModule.start({
        lang: 'ja-JP',
        interimResults: true,
        continuous: true,
        requiresOnDeviceRecognition: !isOnlineRef.current,
        contextualStrings: [wakeWord, ...Object.values(commands)],
        iosCategory,
        // expo-speech-recognition パッチ (#67):
        // setupAudioSession() と AVAudioEngine() の間で setPreferredInput を呼ぶ
        // これにより setCategory() が preferredInput をリセットしても再設定される
        iosPreferredInputUID: preferredInputUID ?? undefined,
        iosPreferredInputName: preferredInputName ?? undefined,
      } as Parameters<typeof ExpoSpeechRecognitionModule.start>[0])
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
    // セッション開始イベント（#65 で役割変更）:
    // prepareSessionForRecognition で既に preferred input を設定済みだが、
    // バックアップとして start 後にも setPreferredInput を呼ぶ。
    // また、allowBluetooth が有効な状態で availableInputs を確認し、
    // ストアの UID が古い場合（プロファイル切替等）に最新 UID に更新する。
    const startSubscription = ExpoSpeechRecognitionModule.addListener(
      'start',
      async () => {
        isSessionActiveRef.current = true

        try {
          const { preferredInputUID, preferredInputName } =
            useAudioDeviceStore.getState()
          if (preferredInputUID) {
            // バックアップ: start 後にも setPreferredInput を適用
            // prepareSessionForRecognition が成功していれば既に設定済みだが、
            // 何らかの理由で失敗した場合のフォールバック
            await AudioRoute.setPreferredInput(
              preferredInputUID,
              preferredInputName
            )

            // allowBluetooth 有効状態で最新の availableInputs を確認し、
            // ストアの UID を最新に更新（名前マッチで見つかった場合）
            if (preferredInputName) {
              const freshInputs = await AudioRoute.getAvailableInputs()
              const matchByName = freshInputs.find(
                (d) => d.name === preferredInputName
              )
              if (matchByName && matchByName.uid !== preferredInputUID) {
                useAudioDeviceStore
                  .getState()
                  .setPreferredInput(matchByName.uid, matchByName.name)
              }
            }
          } else {
            // 明示的に選択されていない場合は最初の利用可能デバイスを自動選択
            const inputs = await AudioRoute.getAvailableInputs()
            if (inputs.length > 0) {
              await AudioRoute.setPreferredInput(inputs[0].uid, inputs[0].name)
            }
          }
        } catch (err) {
          console.error('[useVoiceRecognition] setPreferredInput failed:', err)
        }
      }
    )

    const resultSubscription = ExpoSpeechRecognitionModule.addListener(
      'result',
      (event) => {
        // continuous モードでは results 配列にセグメントが蓄積される
        // results[0] は最初のセグメント（ウェイクワード）のまま固定されるため、
        // 最新のセグメント（末尾）を読む必要がある
        const lastResult = event.results[event.results.length - 1]
        const transcript = lastResult?.transcript ?? ''
        if (!transcript) return

        setLastRecognizedText(transcript)

        if (
          recognitionStateRef.current === VoiceRecognitionState.LISTENING_FOR_WAKEWORD
        ) {
          if (containsWakeWord(transcript)) {
            // ウェイクワード検出時のトランスクリプトを記録（#63）
            // コマンドマッチング時にこの部分を除外し、蓄積テキストによる誤マッチを防ぐ
            wakeWordTranscriptRef.current = transcript
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
          // continuous モードではトランスクリプトが蓄積される場合がある（#63）
          // ウェイクワード部分を除外して新しいテキストのみでコマンドマッチングする
          // これにより前回の「再生」等が残って常にPLAYがマッチする問題を防ぐ
          let commandText = transcript
          const wakeWordPart = wakeWordTranscriptRef.current
          if (wakeWordPart && transcript.startsWith(wakeWordPart)) {
            commandText = transcript.substring(wakeWordPart.length).trim()
          }
          // commandText が空の場合はまだ新しいテキストがない（ウェイクワードの確定イベント等）
          if (!commandText) return

          const command = matchCommand(commandText)
          if (command) {
            clearCommandTimeout()
            updateState(VoiceRecognitionState.PROCESSING)
            onCommandRecognized(command)

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
