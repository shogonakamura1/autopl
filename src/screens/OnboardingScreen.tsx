import React, { useCallback } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { Text, Button, useTheme } from 'react-native-paper'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'
import { useSettingsStore } from '../stores/settingsStore'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>
}

interface OnboardingItem {
  icon: string
  title: string
  description: string
}

const ONBOARDING_ITEMS: OnboardingItem[] = [
  {
    icon: '📁',
    title: 'ファイルをインポート',
    description:
      'ドロワーメニューの「+」ボタンをタップして、mp3・wav・m4aファイルをインポートします。',
  },
  {
    icon: '🎵',
    title: 'ファイルを選択して再生',
    description:
      'ドロワーのファイル一覧からタップして選択。再生ボタンで音楽を再生します。',
  },
  {
    icon: '🎙️',
    title: 'ウェイクワードで起動',
    description:
      'デフォルトは「はい行きます」。イヤホンマイクに向かって発話すると音声操作モードになります。',
  },
  {
    icon: '📊',
    title: '10分割バーで素早く移動',
    description:
      '曲を10等分した縦型バーの各セグメントをタップすると、その位置から再生が始まります。',
  },
]

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme()
  const updateSettings = useSettingsStore((state) => state.updateSettings)

  const handleStart = useCallback(() => {
    updateSettings({ onboardingDone: true })
    navigation.replace('Drawer')
  }, [navigation, updateSettings])

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text
            variant="headlineMedium"
            style={[styles.appName, { color: colors.primary }]}
          >
            Autopl
          </Text>
          <Text
            variant="titleMedium"
            style={[styles.subtitle, { color: colors.onSurfaceVariant }]}
          >
            音声操作ダンス練習プレイヤー
          </Text>
        </View>

        <View style={styles.itemsContainer}>
          {ONBOARDING_ITEMS.map((item, index) => (
            <View
              key={index}
              style={[
                styles.item,
                { backgroundColor: colors.surfaceVariant },
              ]}
            >
              <Text style={styles.itemIcon}>{item.icon}</Text>
              <View style={styles.itemText}>
                <Text
                  variant="titleSmall"
                  style={{ color: colors.onSurface, fontWeight: '600' }}
                >
                  {item.title}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{
                    color: colors.onSurfaceVariant,
                    marginTop: 4,
                    lineHeight: 20,
                  }}
                >
                  {item.description}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.surfaceVariant,
          },
        ]}
      >
        <Button
          mode="contained"
          onPress={handleStart}
          style={styles.startButton}
          contentStyle={styles.startButtonContent}
          accessibilityLabel="使い始める"
        >
          使い始める
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  appName: {
    fontWeight: '700',
    letterSpacing: 1,
  },
  subtitle: {
    marginTop: 8,
  },
  itemsContainer: {
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
    gap: 16,
  },
  itemIcon: {
    fontSize: 28,
    lineHeight: 36,
  },
  itemText: {
    flex: 1,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
  },
  startButton: {
    borderRadius: 12,
  },
  startButtonContent: {
    paddingVertical: 6,
  },
})
