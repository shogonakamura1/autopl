import AsyncStorage from '@react-native-async-storage/async-storage'
import { storageService } from '../storageService'
import { AudioFile, Settings } from '../../types'
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../../constants/defaults'

describe('storageService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
  })

  // ── ファイルメタデータ ──

  describe('loadFiles', () => {
    it('データがない場合は空配列を返す', async () => {
      const files = await storageService.loadFiles()
      expect(files).toEqual([])
    })

    it('保存済みのファイル一覧を返す', async () => {
      const mockFiles: AudioFile[] = [
        {
          id: 'uuid-1',
          name: 'song1.mp3',
          path: '/audio/uuid-1.mp3',
          duration: 240,
          createdAt: Date.now(),
        },
      ]
      await AsyncStorage.setItem(
        STORAGE_KEYS.FILES,
        JSON.stringify(mockFiles)
      )

      const files = await storageService.loadFiles()
      expect(files).toEqual(mockFiles)
    })
  })

  describe('saveFiles', () => {
    it('ファイル一覧を保存できる', async () => {
      const mockFiles: AudioFile[] = [
        {
          id: 'uuid-1',
          name: 'song1.mp3',
          path: '/audio/uuid-1.mp3',
          duration: 240,
          createdAt: Date.now(),
        },
      ]
      await storageService.saveFiles(mockFiles)

      const stored = await AsyncStorage.getItem(STORAGE_KEYS.FILES)
      expect(JSON.parse(stored!)).toEqual(mockFiles)
    })
  })

  // ── 選択中ファイルID ──

  describe('loadSelectedFileId', () => {
    it('データがない場合はnullを返す', async () => {
      const fileId = await storageService.loadSelectedFileId()
      expect(fileId).toBeNull()
    })

    it('保存済みのファイルIDを返す', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_FILE_ID, 'uuid-1')

      const fileId = await storageService.loadSelectedFileId()
      expect(fileId).toBe('uuid-1')
    })
  })

  describe('saveSelectedFileId', () => {
    it('ファイルIDを保存できる', async () => {
      await storageService.saveSelectedFileId('uuid-1')

      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_FILE_ID)
      expect(stored).toBe('uuid-1')
    })

    it('nullを渡すとキーが削除される', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_FILE_ID, 'uuid-1')
      await storageService.saveSelectedFileId(null)

      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_FILE_ID)
      expect(stored).toBeNull()
    })
  })

  // ── 設定 ──

  describe('loadSettings', () => {
    it('データがない場合はデフォルト設定を返す', async () => {
      const settings = await storageService.loadSettings()
      expect(settings).toEqual(DEFAULT_SETTINGS)
    })

    it('保存済みの設定を返す', async () => {
      const customSettings: Settings = {
        ...DEFAULT_SETTINGS,
        wakeWord: 'スタート',
        timeoutSeconds: 20,
      }
      await AsyncStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(customSettings)
      )

      const settings = await storageService.loadSettings()
      expect(settings.wakeWord).toBe('スタート')
      expect(settings.timeoutSeconds).toBe(20)
    })

    it('部分的な設定でもデフォルトとマージされる', async () => {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify({ wakeWord: 'テスト' })
      )

      const settings = await storageService.loadSettings()
      expect(settings.wakeWord).toBe('テスト')
      expect(settings.commands).toEqual(DEFAULT_SETTINGS.commands)
      expect(settings.timeoutSeconds).toBe(DEFAULT_SETTINGS.timeoutSeconds)
    })
  })

  describe('saveSettings', () => {
    it('設定を保存できる', async () => {
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        soundEnabled: false,
      }
      await storageService.saveSettings(settings)

      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS)
      expect(JSON.parse(stored!).soundEnabled).toBe(false)
    })
  })

  // ── 全データクリア ──

  describe('clearAll', () => {
    it('全てのキーが削除される', async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.FILES, '[]')
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_FILE_ID, 'uuid-1')
      await AsyncStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(DEFAULT_SETTINGS)
      )

      await storageService.clearAll()

      const files = await AsyncStorage.getItem(STORAGE_KEYS.FILES)
      const fileId = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_FILE_ID)
      const settings = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS)

      expect(files).toBeNull()
      expect(fileId).toBeNull()
      expect(settings).toBeNull()
    })
  })
})
