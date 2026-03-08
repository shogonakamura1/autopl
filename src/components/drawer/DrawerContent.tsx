import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import {
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from '@react-navigation/drawer'

/**
 * ドロワー内コンテンツ（ファイル一覧）
 * Issue #12 で本実装予定
 */
export const DrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  const { colors } = useTheme()

  return (
    <DrawerContentScrollView
      {...props}
      style={[styles.container, { backgroundColor: colors.surface }]}
    >
      <View style={styles.placeholder}>
        <Text
          variant="bodySmall"
          style={{ color: colors.onSurfaceVariant }}
        >
          ファイル一覧（Issue #12 で実装予定）
        </Text>
      </View>
    </DrawerContentScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  placeholder: {
    padding: 16,
    alignItems: 'center',
  },
})
