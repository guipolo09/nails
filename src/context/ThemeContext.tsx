// ============================================
// CONTEXTO DE TEMA
// Gerencia tema claro/escuro do aplicativo
// ============================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import { COLORS } from '../utils/constants';
import { settingsRepository } from '../services/settingsRepository';
import type { ThemeMode } from '../types';

const fontConfig = {
  fontFamily: 'System',
};

// Tema claro
const lightTheme = {
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

// Tema escuro
const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: COLORS.primary,
    primaryContainer: '#4A1530',
    secondary: COLORS.secondary,
    secondaryContainer: '#4A1C44',
    background: '#121212',
    surface: '#1E1E1E',
    surfaceVariant: '#2C2C2C',
    error: COLORS.error,
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#FFD8E4',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#FFD8E4',
    onBackground: '#E0E0E0',
    onSurface: '#E0E0E0',
    onSurfaceVariant: '#BDBDBD',
    onError: '#FFFFFF',
    outline: '#424242',
    elevation: {
      level0: 'transparent',
      level1: '#1E1E1E',
      level2: '#232323',
      level3: '#282828',
      level4: '#2C2C2C',
      level5: '#2E2E2E',
    },
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: 12,
};

export type AppTheme = typeof lightTheme;

interface ThemeContextType {
  theme: AppTheme;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');

  // Carrega o tema salvo ao iniciar
  useEffect(() => {
    const loadTheme = async () => {
      const settings = await settingsRepository.getSettings();
      setThemeModeState(settings.theme);
    };
    loadTheme();
  }, []);

  // Atualiza o tema e salva no storage
  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await settingsRepository.updateSettings({ theme: mode });
  };

  // Alterna entre tema claro e escuro
  const toggleTheme = () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
  };

  const theme = themeMode === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ theme, themeMode, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
