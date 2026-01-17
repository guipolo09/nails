// ============================================
// TEMA DO APLICATIVO (React Native Paper)
// ============================================

import { MD3LightTheme, configureFonts } from 'react-native-paper';
import { COLORS } from './constants';

const fontConfig = {
  fontFamily: 'System',
};

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    primaryContainer: COLORS.primaryLight,
    secondary: COLORS.secondary,
    background: COLORS.background,
    surface: COLORS.surface,
    error: COLORS.error,
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: COLORS.text,
    onSurface: COLORS.text,
    outline: COLORS.border,
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: 12,
};

export type AppTheme = typeof theme;
