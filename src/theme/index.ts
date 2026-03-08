import {
  MD3LightTheme,
  MD3DarkTheme,
  MD3Theme,
} from 'react-native-paper'

/**
 * Autopl Light Theme
 * React Native Paper (Material Design 3) + Apple HIG 準拠
 */
export const AutoplLightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1A73E8',
    primaryContainer: '#D3E3FD',
    onPrimaryContainer: '#0842A0',
    secondary: '#5F6368',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceVariant: '#F1F3F4',
  },
}

/**
 * Autopl Dark Theme
 * React Native Paper (Material Design 3) + Apple HIG 準拠
 */
export const AutoplDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#8AB4F8',
    primaryContainer: '#0842A0',
    onPrimaryContainer: '#D3E3FD',
    secondary: '#9AA0A6',
    background: '#1C1C1E',
    surface: '#2C2C2E',
    surfaceVariant: '#3A3A3C',
  },
}
