import React, { useState, useCallback, useMemo } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import {
  Appbar,
  TextInput,
  Switch,
  Text,
  Button,
  Divider,
  useTheme,
} from 'react-native-paper'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'
import { VoiceCommand } from '../types'
import { useSettingsStore } from '../stores/settingsStore'
import { useAudioDeviceRoute } from '../hooks/useAudioDeviceRoute'
import { AudioDevicePicker } from '../components/settings/AudioDevicePicker'
import {
  validateWakeWord,
  validateCommandWord,
  validateTimeout,
} from '../utils/validation'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>
}

const COMMAND_LABELS: Record<VoiceCommand, string> = {
  [VoiceCommand.PLAY]: '再生',
  [VoiceCommand.PAUSE]: '停止',
  [VoiceCommand.NEXT]: '次',
  [VoiceCommand.PREVIOUS]: '前',
  [VoiceCommand.SKIP_TO_START]: '最初から',
  [VoiceCommand.VOLUME_UP]: '音量上げて',
  [VoiceCommand.VOLUME_DOWN]: '音量下げて',
}

type FieldErrors = {
  wakeWord: string | null
  commands: Record<VoiceCommand, string | null>
  timeout: string | null
}

const INITIAL_ERRORS: FieldErrors = {
  wakeWord: null,
  commands: {
    [VoiceCommand.PLAY]: null,
    [VoiceCommand.PAUSE]: null,
    [VoiceCommand.NEXT]: null,
    [VoiceCommand.PREVIOUS]: null,
    [VoiceCommand.SKIP_TO_START]: null,
    [VoiceCommand.VOLUME_UP]: null,
    [VoiceCommand.VOLUME_DOWN]: null,
  },
  timeout: null,
}

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme()

  const {
    availableInputs,
    availableOutputs,
    preferredInputUID,
    preferredOutputUID,
    selectInput,
    selectOutput,
  } = useAudioDeviceRoute()

  const storeWakeWord = useSettingsStore((state) => state.wakeWord)
  const storeCommands = useSettingsStore((state) => state.commands)
  const storeTimeoutSeconds = useSettingsStore((state) => state.timeoutSeconds)
  const storeSoundEnabled = useSettingsStore((state) => state.soundEnabled)
  const updateSettings = useSettingsStore((state) => state.updateSettings)

  const [wakeWord, setWakeWord] = useState(storeWakeWord)
  const [commands, setCommands] = useState({ ...storeCommands })
  const [timeoutText, setTimeoutText] = useState(String(storeTimeoutSeconds))
  const [soundEnabled, setSoundEnabled] = useState(storeSoundEnabled)
  const [errors, setErrors] = useState<FieldErrors>(INITIAL_ERRORS)

  const commandKeys = useMemo(
    () => Object.values(VoiceCommand),
    []
  )

  const validateWakeWordField = useCallback(() => {
    const error = validateWakeWord(wakeWord)
    setErrors((prev) => ({ ...prev, wakeWord: error }))
    return error === null
  }, [wakeWord])

  const validateCommandField = useCallback(
    (command: VoiceCommand) => {
      const otherValues = commandKeys
        .filter((key) => key !== command)
        .map((key) => commands[key])
      const error = validateCommandWord(
        commands[command],
        otherValues,
        wakeWord
      )
      setErrors((prev) => ({
        ...prev,
        commands: { ...prev.commands, [command]: error },
      }))
      return error === null
    },
    [commands, commandKeys, wakeWord]
  )

  const validateTimeoutField = useCallback(() => {
    const error = validateTimeout(timeoutText)
    setErrors((prev) => ({ ...prev, timeout: error }))
    return error === null
  }, [timeoutText])

  const handleCommandChange = useCallback(
    (command: VoiceCommand, value: string) => {
      setCommands((prev) => ({ ...prev, [command]: value }))
    },
    []
  )

  const handleSave = useCallback(() => {
    const isWakeWordValid = validateWakeWordField()
    const isTimeoutValid = validateTimeoutField()
    const commandValidations = commandKeys.map((key) =>
      validateCommandField(key)
    )
    const areCommandsValid = commandValidations.every(Boolean)

    if (!isWakeWordValid || !isTimeoutValid || !areCommandsValid) return

    updateSettings({
      wakeWord: wakeWord.trim(),
      commands,
      timeoutSeconds: Number(timeoutText),
      soundEnabled,
      onboardingDone: useSettingsStore.getState().onboardingDone,
    })

    navigation.goBack()
  }, [
    wakeWord,
    commands,
    timeoutText,
    soundEnabled,
    validateWakeWordField,
    validateTimeoutField,
    validateCommandField,
    commandKeys,
    updateSettings,
    navigation,
  ])

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header style={{ backgroundColor: colors.surface }}>
        <Appbar.BackAction
          onPress={() => navigation.goBack()}
          accessibilityLabel="戻る"
        />
        <Appbar.Content title="設定" />
        <Appbar.Action
          icon="check"
          onPress={handleSave}
          accessibilityLabel="保存"
        />
      </Appbar.Header>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text
          variant="titleMedium"
          style={[styles.sectionTitle, { color: colors.primary }]}
        >
          オーディオデバイス
        </Text>
        <View style={styles.deviceRow}>
          <AudioDevicePicker
            iconName="microphone"
            selectedUID={preferredInputUID}
            devices={availableInputs}
            onSelect={selectInput}
            accessibilityLabel="マイクデバイスを選択"
          />
          <AudioDevicePicker
            iconName="volume-high"
            selectedUID={preferredOutputUID}
            devices={availableOutputs}
            onSelect={selectOutput}
            accessibilityLabel="スピーカーデバイスを選択"
          />
        </View>

        <Divider style={styles.divider} />

        <Text
          variant="titleMedium"
          style={[styles.sectionTitle, { color: colors.primary }]}
        >
          ウェイクワード
        </Text>
        <TextInput
          mode="outlined"
          label="ウェイクワード"
          value={wakeWord}
          onChangeText={setWakeWord}
          onBlur={validateWakeWordField}
          error={errors.wakeWord !== null}
          accessibilityLabel="ウェイクワード入力"
        />
        {errors.wakeWord && (
          <Text
            variant="bodySmall"
            style={[styles.errorText, { color: colors.error }]}
          >
            {errors.wakeWord}
          </Text>
        )}

        <Divider style={styles.divider} />

        <Text
          variant="titleMedium"
          style={[styles.sectionTitle, { color: colors.primary }]}
        >
          コマンド語
        </Text>
        {commandKeys.map((command) => (
          <View key={command} style={styles.commandField}>
            <TextInput
              mode="outlined"
              label={COMMAND_LABELS[command]}
              value={commands[command]}
              onChangeText={(value) => handleCommandChange(command, value)}
              onBlur={() => validateCommandField(command)}
              error={errors.commands[command] !== null}
              accessibilityLabel={`${COMMAND_LABELS[command]}コマンド入力`}
            />
            {errors.commands[command] && (
              <Text
                variant="bodySmall"
                style={[styles.errorText, { color: colors.error }]}
              >
                {errors.commands[command]}
              </Text>
            )}
          </View>
        ))}

        <Divider style={styles.divider} />

        <Text
          variant="titleMedium"
          style={[styles.sectionTitle, { color: colors.primary }]}
        >
          タイムアウト
        </Text>
        <TextInput
          mode="outlined"
          label="タイムアウト（秒）"
          value={timeoutText}
          onChangeText={setTimeoutText}
          onBlur={validateTimeoutField}
          keyboardType="number-pad"
          error={errors.timeout !== null}
          accessibilityLabel="タイムアウト秒数入力"
        />
        {errors.timeout && (
          <Text
            variant="bodySmall"
            style={[styles.errorText, { color: colors.error }]}
          >
            {errors.timeout}
          </Text>
        )}

        <Divider style={styles.divider} />

        <View style={styles.switchRow}>
          <Text variant="bodyLarge" style={{ color: colors.onSurface }}>
            フィードバック音
          </Text>
          <Switch
            value={soundEnabled}
            onValueChange={setSoundEnabled}
            accessibilityLabel="フィードバック音の切り替え"
          />
        </View>

        <Divider style={styles.divider} />

        <Button
          mode="outlined"
          onPress={handleSave}
          style={styles.saveButton}
          accessibilityLabel="設定を保存"
        >
          保存
        </Button>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  commandField: {
    marginBottom: 8,
  },
  errorText: {
    marginTop: 4,
    marginLeft: 4,
  },
  divider: {
    marginVertical: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  saveButton: {
    marginTop: 8,
  },
  deviceRow: {
    flexDirection: 'row',
    gap: 8,
  },
})
