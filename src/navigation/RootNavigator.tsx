import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { useTheme } from 'react-native-paper'
import { RootStackParamList, DrawerParamList } from './types'
import { MainScreen } from '../screens/MainScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { OnboardingScreen } from '../screens/OnboardingScreen'
import { DrawerContent } from '../components/drawer/DrawerContent'
import { useSettingsStore } from '../stores/settingsStore'

const Stack = createNativeStackNavigator<RootStackParamList>()
const Drawer = createDrawerNavigator<DrawerParamList>()

/**
 * ドロワーナビゲーター
 * 左1/3スライドインのファイル一覧ドロワー
 */
const DrawerNavigator: React.FC = () => {
  const { colors } = useTheme()

  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        drawerStyle: {
          width: '33%',
          backgroundColor: colors.surface,
        },
        headerShown: false,
        drawerType: 'slide',
      }}
    >
      <Drawer.Screen name="Main" component={MainScreen} />
    </Drawer.Navigator>
  )
}

/**
 * ルートナビゲーター
 * Onboarding（初回のみ） + DrawerNavigator（メイン） + Settings（スタック）
 */
export const RootNavigator: React.FC = () => {
  const onboardingDone = useSettingsStore((state) => state.onboardingDone)

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!onboardingDone && (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      )}
      <Stack.Screen name="Drawer" component={DrawerNavigator} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  )
}
