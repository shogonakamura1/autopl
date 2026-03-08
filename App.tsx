import React from 'react'
import { useColorScheme } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { PaperProvider } from 'react-native-paper'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { AutoplLightTheme, AutoplDarkTheme } from './src/theme'
import { RootNavigator } from './src/navigation/RootNavigator'
import { useAppRestore } from './src/hooks/useAppRestore'

function AppContent() {
  useAppRestore()
  return <RootNavigator />
}

export default function App() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const theme = isDark ? AutoplDarkTheme : AutoplLightTheme

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <NavigationContainer>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <AppContent />
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
