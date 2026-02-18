// ============================================
// APLICATIVO PRINCIPAL - NAILS
// Agendamento para Salão de Manicure
// ============================================

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { AppNavigator } from './src/navigation';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import {
  setupNotificationHandler,
  setupNotificationChannel,
  scheduleDailyMorningReminder,
  scheduleDailyEveningReminder,
} from './src/services/notificationService';
import { settingsRepository } from './src/services/settingsRepository';
import { initDatabase } from './src/database/database';

// Inicializa o banco de dados SQLite antes da renderização
initDatabase();

function AppContent() {
  const { theme, themeMode } = useTheme();

  // Inicializa notificações e agenda lembretes diários ao abrir o app
  useEffect(() => {
    setupNotificationHandler();

    const initNotifications = async () => {
      await setupNotificationChannel();

      const settings = await settingsRepository.getSettings();
      const { reminderSettings, businessHours } = settings;

      if (reminderSettings.dailyMorningReminderEnabled) {
        await scheduleDailyMorningReminder(businessHours.start);
      }
      if (reminderSettings.dailyEveningReminderEnabled) {
        await scheduleDailyEveningReminder(businessHours.end);
      }
    };

    initNotifications().catch(console.error);
  }, []);

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
