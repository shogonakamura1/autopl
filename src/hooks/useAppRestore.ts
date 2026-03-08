import { useEffect, useRef } from 'react'
import NetInfo from '@react-native-community/netinfo'
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition'
import { useFileStore } from '../stores/fileStore'
import { useVoiceStore } from '../stores/voiceStore'
import { fileService } from '../services/fileService'

/**
 * アプリ起動時の復元フック
 *
 * Zustand persistによりファイル一覧・選択ファイルID・設定値は
 * AsyncStorageから自動復元される。
 * このフックでは以下を行う:
 * 1. 選択ファイルがディスク上に存在するか検証（存在しなければ選択解除）
 * 2. ファイル一覧の存在しないファイルを除去
 * 3. オンライン状態の初期検出
 * 4. マイク権限の確認
 */
export const useAppRestore = (): void => {
  const hasRestored = useRef(false)

  const files = useFileStore((state) => state.files)
  const selectedFileId = useFileStore((state) => state.selectedFileId)
  const removeFile = useFileStore((state) => state.removeFile)
  const clearSelection = useFileStore((state) => state.clearSelection)
  const setIsOnline = useVoiceStore((state) => state.setIsOnline)
  const setHasMicPermission = useVoiceStore(
    (state) => state.setHasMicPermission
  )

  useEffect(() => {
    if (hasRestored.current) return
    hasRestored.current = true

    const restore = async () => {
      // 1. ネットワーク状態確認
      try {
        const netState = await NetInfo.fetch()
        setIsOnline(netState.isConnected ?? true)
      } catch (error) {
        console.error('[useAppRestore] NetInfo.fetch failed:', error)
      }

      // 2. マイク権限確認
      try {
        const permissionResult =
          await ExpoSpeechRecognitionModule.getPermissionsAsync()
        setHasMicPermission(permissionResult.granted)
      } catch (error) {
        console.error('[useAppRestore] getPermissionsAsync failed:', error)
      }

      // 3. ファイル存在検証（ディスクから削除されたファイルを除去）
      try {
        const missingFileIds: string[] = []
        for (const file of files) {
          if (!fileService.fileExists(file.path)) {
            missingFileIds.push(file.id)
          }
        }
        for (const id of missingFileIds) {
          console.warn(`[useAppRestore] File not found on disk, removing: ${id}`)
          removeFile(id)
        }

        // 4. 選択中ファイルが除去されていれば選択解除
        if (selectedFileId && missingFileIds.includes(selectedFileId)) {
          clearSelection()
        }
      } catch (error) {
        console.error('[useAppRestore] file validation failed:', error)
      }
    }

    restore()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
