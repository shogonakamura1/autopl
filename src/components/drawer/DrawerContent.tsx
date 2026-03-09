import React, { useState, useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import {
  Dialog,
  FAB,
  Portal,
  Text,
  Button,
  useTheme,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DrawerContentComponentProps } from '@react-navigation/drawer'
import { AudioFile } from '../../types'
import { useFileStore } from '../../stores/fileStore'
import { usePlayerStore } from '../../stores/playerStore'
import { useFileImport } from '../../hooks/useFileImport'
import { fileService } from '../../services/fileService'
import { FileList } from './FileList'

export const DrawerContent: React.FC<DrawerContentComponentProps> = () => {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const files = useFileStore((state) => state.files)
  const selectedFileId = useFileStore((state) => state.selectedFileId)
  const selectFile = useFileStore((state) => state.selectFile)
  const removeFile = useFileStore((state) => state.removeFile)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const { pickAndImportFile, isImporting } = useFileImport()

  const [deleteTarget, setDeleteTarget] = useState<AudioFile | null>(null)
  const [isDeleteDialogVisible, setIsDeleteDialogVisible] = useState(false)

  const handleFileSelect = useCallback(
    (id: string) => { selectFile(id) },
    [selectFile]
  )

  const handleFileDelete = useCallback(
    (file: AudioFile) => {
      if (isPlaying && file.id === selectedFileId) {
        setDeleteTarget(file)
        setIsDeleteDialogVisible(true)
        return
      }
      performDelete(file)
    },
    [isPlaying, selectedFileId]
  )

  const performDelete = useCallback(
    async (file: AudioFile) => {
      try {
        await fileService.deleteFile(file.path)
      } catch (error) {
        console.error('[DrawerContent] deleteFile failed:', error)
      }
      removeFile(file.id)
    },
    [removeFile]
  )

  const handleConfirmDelete = useCallback(() => {
    if (deleteTarget) performDelete(deleteTarget)
    setIsDeleteDialogVisible(false)
    setDeleteTarget(null)
  }, [deleteTarget, performDelete])

  const handleCancelDelete = useCallback(() => {
    setIsDeleteDialogVisible(false)
    setDeleteTarget(null)
  }, [])

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface }]}>
        <Text variant="titleLarge" style={[styles.headerTitle, { color: colors.onSurface }]}>
          ファイル一覧
        </Text>
      </View>

      <FileList
        files={files}
        selectedFileId={selectedFileId}
        onFileSelect={handleFileSelect}
        onFileDelete={handleFileDelete}
      />

      <FAB
        icon="plus"
        label="インポート"
        onPress={pickAndImportFile}
        loading={isImporting}
        disabled={isImporting}
        style={[
          styles.fab,
          { backgroundColor: colors.primary, bottom: insets.bottom + 16 },
        ]}
        color={colors.onPrimary}
        accessibilityLabel="ファイルをインポート"
      />

      <Portal>
        <Dialog visible={isDeleteDialogVisible} onDismiss={handleCancelDelete}>
          <Dialog.Title>再生中のファイルを削除</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              「{deleteTarget?.name}」は現在再生中です。削除しますか？
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCancelDelete}>キャンセル</Button>
            <Button onPress={handleConfirmDelete} textColor={colors.error}>
              削除
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 14,
  },
})
