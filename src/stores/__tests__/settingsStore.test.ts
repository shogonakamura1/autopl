import { useSettingsStore } from '../settingsStore'
import { VoiceCommand } from '../../types'
import {
  DEFAULT_WAKE_WORD,
  DEFAULT_COMMANDS,
  DEFAULT_TIMEOUT_SECONDS,
  DEFAULT_SOUND_ENABLED,
} from '../../constants/defaults'

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.getState().resetSettings()
  })

  describe('初期値', () => {
    it('デフォルトのウェイクワードが設定されている', () => {
      expect(useSettingsStore.getState().wakeWord).toBe(DEFAULT_WAKE_WORD)
    })

    it('デフォルトのコマンドが設定されている', () => {
      expect(useSettingsStore.getState().commands).toEqual(DEFAULT_COMMANDS)
    })

    it('デフォルトのタイムアウトが設定されている', () => {
      expect(useSettingsStore.getState().timeoutSeconds).toBe(
        DEFAULT_TIMEOUT_SECONDS
      )
    })

    it('デフォルトのフィードバック音が設定されている', () => {
      expect(useSettingsStore.getState().soundEnabled).toBe(
        DEFAULT_SOUND_ENABLED
      )
    })
  })

  describe('updateSettings', () => {
    it('ウェイクワードを変更できる', () => {
      useSettingsStore.getState().updateSettings({ wakeWord: 'スタート' })
      expect(useSettingsStore.getState().wakeWord).toBe('スタート')
    })

    it('タイムアウト秒数を変更できる', () => {
      useSettingsStore.getState().updateSettings({ timeoutSeconds: 20 })
      expect(useSettingsStore.getState().timeoutSeconds).toBe(20)
    })

    it('フィードバック音をOFFにできる', () => {
      useSettingsStore.getState().updateSettings({ soundEnabled: false })
      expect(useSettingsStore.getState().soundEnabled).toBe(false)
    })

    it('コマンド語を変更できる', () => {
      const newCommands = {
        ...DEFAULT_COMMANDS,
        [VoiceCommand.PLAY]: 'スタート',
      }
      useSettingsStore.getState().updateSettings({ commands: newCommands })
      expect(useSettingsStore.getState().commands[VoiceCommand.PLAY]).toBe(
        'スタート'
      )
    })

    it('複数の設定を同時に変更できる', () => {
      useSettingsStore.getState().updateSettings({
        wakeWord: 'オッケー',
        timeoutSeconds: 15,
        soundEnabled: false,
      })

      const state = useSettingsStore.getState()
      expect(state.wakeWord).toBe('オッケー')
      expect(state.timeoutSeconds).toBe(15)
      expect(state.soundEnabled).toBe(false)
    })

    it('変更していない設定は維持される', () => {
      useSettingsStore.getState().updateSettings({ wakeWord: 'テスト' })

      expect(useSettingsStore.getState().commands).toEqual(DEFAULT_COMMANDS)
      expect(useSettingsStore.getState().timeoutSeconds).toBe(
        DEFAULT_TIMEOUT_SECONDS
      )
    })
  })

  describe('resetSettings', () => {
    it('全設定が初期値にリセットされる', () => {
      useSettingsStore.getState().updateSettings({
        wakeWord: 'テスト',
        timeoutSeconds: 30,
        soundEnabled: false,
        onboardingDone: true,
      })

      useSettingsStore.getState().resetSettings()

      const state = useSettingsStore.getState()
      expect(state.wakeWord).toBe(DEFAULT_WAKE_WORD)
      expect(state.commands).toEqual(DEFAULT_COMMANDS)
      expect(state.timeoutSeconds).toBe(DEFAULT_TIMEOUT_SECONDS)
      expect(state.soundEnabled).toBe(DEFAULT_SOUND_ENABLED)
      expect(state.onboardingDone).toBe(false)
    })
  })
})
