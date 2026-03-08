import AsyncStorage from '@react-native-async-storage/async-storage'
import { AudioFile, Settings } from '../types'
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../constants/defaults'

/**
 * AsyncStorage ラッパーサービス
 * 設定値・ファイルメタデータの永続化を担当
 */
export const storageService = {
  // ── ファイルメタデータ ──

  async loadFiles(): Promise<AudioFile[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.FILES)
      if (json === null) return []
      return JSON.parse(json) as AudioFile[]
    } catch (error) {
      console.error('[StorageService] loadFiles failed:', error)
      return []
    }
  },

  async saveFiles(files: AudioFile[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files))
    } catch (error) {
      console.error('[StorageService] saveFiles failed:', error)
    }
  },

  // ── 選択中ファイルID ──

  async loadSelectedFileId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_FILE_ID)
    } catch (error) {
      console.error('[StorageService] loadSelectedFileId failed:', error)
      return null
    }
  },

  async saveSelectedFileId(fileId: string | null): Promise<void> {
    try {
      if (fileId === null) {
        await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_FILE_ID)
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_FILE_ID, fileId)
      }
    } catch (error) {
      console.error('[StorageService] saveSelectedFileId failed:', error)
    }
  },

  // ── 設定 ──

  async loadSettings(): Promise<Settings> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS)
      if (json === null) return DEFAULT_SETTINGS
      return { ...DEFAULT_SETTINGS, ...JSON.parse(json) } as Settings
    } catch (error) {
      console.error('[StorageService] loadSettings failed:', error)
      return DEFAULT_SETTINGS
    }
  },

  async saveSettings(settings: Settings): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(settings)
      )
    } catch (error) {
      console.error('[StorageService] saveSettings failed:', error)
    }
  },

  // ── 全データクリア ──

  async clearAll(): Promise<void> {
    try {
      const keys = [
        STORAGE_KEYS.FILES,
        STORAGE_KEYS.SELECTED_FILE_ID,
        STORAGE_KEYS.SETTINGS,
        STORAGE_KEYS.ONBOARDING_DONE,
      ]
      await Promise.all(keys.map((key) => AsyncStorage.removeItem(key)))
    } catch (error) {
      console.error('[StorageService] clearAll failed:', error)
    }
  },
}
