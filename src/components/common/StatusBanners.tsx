import React from 'react'
import { View, StyleSheet, Pressable, Linking } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { useVoiceStore } from '../../stores/voiceStore'

/**
 * オフライン・マイク権限拒否時のバナー表示
 */
export const StatusBanners: React.FC = () => {
  const { colors } = useTheme()
  const isOnline = useVoiceStore((state) => state.isOnline)
  const hasMicPermission = useVoiceStore((state) => state.hasMicPermission)

  const handleOpenSettings = () => {
    Linking.openSettings()
  }

  if (hasMicPermission && isOnline) return null

  return (
    <View style={styles.container}>
      {!hasMicPermission && (
        <Pressable
          style={[styles.banner, { backgroundColor: colors.errorContainer }]}
          onPress={handleOpenSettings}
          accessibilityLabel="設定アプリでマイクの使用を許可する"
          accessibilityRole="button"
        >
          <Text
            variant="bodySmall"
            style={[styles.bannerText, { color: colors.onErrorContainer }]}
          >
            マイクの使用が許可されていないため音声操作が使用できません。タップして設定アプリから許可してください。
          </Text>
        </Pressable>
      )}
      {hasMicPermission && !isOnline && (
        <View
          style={[
            styles.banner,
            { backgroundColor: colors.secondaryContainer },
          ]}
          accessibilityLabel="オフライン状態の通知"
        >
          <Text
            variant="bodySmall"
            style={[styles.bannerText, { color: colors.onSecondaryContainer }]}
          >
            オンラインになると音声認識の精度が向上します
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bannerText: {
    textAlign: 'center',
    lineHeight: 18,
  },
})
