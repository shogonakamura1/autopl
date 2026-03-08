import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, useTheme, Appbar } from 'react-native-paper'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>
}

/**
 * 設定画面
 * Issue #13 で本実装予定
 */
export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction
          onPress={() => navigation.goBack()}
          accessibilityLabel="戻る"
        />
        <Appbar.Content title="設定" />
      </Appbar.Header>
      <View style={styles.body}>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
          設定画面（Issue #13 で実装予定）
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
