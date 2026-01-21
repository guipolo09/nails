// ============================================
// APLICATIVO PRINCIPAL - NAILS
// Agendamento para Salão de Manicure
// ============================================

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { AppNavigator } from './src/navigation';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

function AppContent() {
  const { theme, themeMode } = useTheme();

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <StatusBar style={themeMode === 'dark' ? 'light' : 'auto'} />
        <AppNavigator />
      </NavigationContainer>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
