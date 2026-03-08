import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { DrawerNavigationProp } from '@react-navigation/drawer'
import { DrawerParamList } from '../navigation/types'

type Props = {
  navigation: DrawerNavigationProp<DrawerParamList, 'Main'>
}

/**
 * 再生画面（メイン画面）
 * Issue #10 で本実装予定
 */
export const MainScreen: React.FC<Props> = () => {
  const { colors } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text variant="headlineMedium" style={{ color: colors.onBackground }}>
        Autopl
      </Text>
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
        音楽ファイルをインポートして練習を開始してください
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
})
