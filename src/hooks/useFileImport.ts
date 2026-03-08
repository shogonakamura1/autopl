import { useState, useCallback } from 'react'
import * as DocumentPicker from 'expo-document-picker'
import { AudioFile } from '../types'
import { useFileStore } from '../stores/fileStore'
import { fileService } from '../services/fileService'
import { validateImportFile, sanitizeFileName } from '../utils/validation'

interface UseFileImportResult {
  isImporting: boolean
  importError: string | null
  pickAndImportFile: () => Promise<void>
  importFromUri: (uri: string, name: string, size: number) => Promise<void>
  clearError: () => void
}

const generateUuid = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    (character) => {
      const random = (Math.random() * 16) | 0
      const value = character === 'x' ? random : (random & 0x3) | 0x8
      return value.toString(16)
    }
  )
}

const getExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

export const useFileImport = (): UseFileImportResult => {
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const files = useFileStore((state) => state.files)
  const addFile = useFileStore((state) => state.addFile)

  const clearError = useCallback(() => {
    setImportError(null)
  }, [])

  const importFromUri = useCallback(
    async (uri: string, name: string, size: number) => {
      setImportError(null)
      setIsImporting(true)

      try {
        const sanitizedName = sanitizeFileName(name)
        const validationError = validateImportFile(
          { name: sanitizedName, size },
          files
        )

        if (validationError) {
          setImportError(validationError)
          return
        }

        const fileId = generateUuid()
        const extension = getExtension(sanitizedName)
        const savedPath = await fileService.copyToAudioDir(
          uri,
          fileId,
          extension
        )

        const audioFile: AudioFile = {
          id: fileId,
          name: sanitizedName,
          path: savedPath,
          duration: 0, // 後でTrackPlayerから取得
          createdAt: Date.now(),
        }

        addFile(audioFile)
      } catch (error) {
        console.error('[useFileImport] importFromUri failed:', error)
        setImportError('ファイルのインポートに失敗しました')
      } finally {
        setIsImporting(false)
      }
    },
    [files, addFile]
  )

  const pickAndImportFile = useCallback(async () => {
    setImportError(null)

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/mp4'],
      })

      if (result.canceled) return

      const pickedFile = result.assets[0]
      if (!pickedFile) return

      await importFromUri(
        pickedFile.uri,
        pickedFile.name,
        pickedFile.size ?? 0
      )
    } catch (error) {
      console.error('[useFileImport] pickAndImportFile failed:', error)
      setImportError('ファイルの選択に失敗しました')
    }
  }, [importFromUri])

  return {
    isImporting,
    importError,
    pickAndImportFile,
    importFromUri,
    clearError,
  }
}
