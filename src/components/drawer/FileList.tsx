import React, { useCallback } from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { AudioFile } from '../../types'
import { FileListItem } from './FileListItem'

interface FileListProps {
  files: AudioFile[]
  selectedFileId: string | null
  onFileSelect: (id: string) => void
  onFileDelete: (file: AudioFile) => void
}

export const FileList: React.FC<FileListProps> = ({
  files,
  selectedFileId,
  onFileSelect,
  onFileDelete,
}) => {
  const { colors } = useTheme()

  const renderItem = useCallback(
    ({ item }: { item: AudioFile }) => (
      <FileListItem
        file={item}
        isSelected={item.id === selectedFileId}
        onPress={onFileSelect}
        onDelete={onFileDelete}
      />
    ),
    [selectedFileId, onFileSelect, onFileDelete]
  )

  const keyExtractor = useCallback((item: AudioFile) => item.id, [])

  if (files.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text
          variant="bodyMedium"
          style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}
        >
          ファイルがありません
        </Text>
        <Text
          variant="bodySmall"
          style={{
            color: colors.onSurfaceVariant,
            textAlign: 'center',
            opacity: 0.7,
            marginTop: 4,
          }}
        >
          「+」ボタンからインポートしてください
        </Text>
      </View>
    )
  }

  return (
    <FlatList
      data={files}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      style={{ backgroundColor: colors.surface }}
      contentContainerStyle={styles.listContent}
    />
  )
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  listContent: {
    paddingVertical: 8,
  },
})
