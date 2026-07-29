// ============================================
// APLICATIVO PRINCIPAL - NAILS
// Agendamento para Salão de Manicure
// ============================================

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, ActivityIndicator } from 'react-native';

import { AppNavigator } from './src/navigation';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AccountProvider } from './src/context/AccountContext';
import { EntitlementProvider } from './src/context/EntitlementContext';
import { initMonetization } from './src/monetization';
import { LockScreen, ConsentScreen } from './src/screens';
import { hasConsented } from './src/services/consentService';
import {
  setupNotificationHandler,
  setupNotificationChannel,
  scheduleDailyMorningReminder,
  scheduleDailyEveningReminder,
} from './src/services/notificationService';
import { settingsRepository } from './src/services/settingsRepository';
import { initDatabase } from './src/database/database';
import { runMigrations } from './src/database/migrations';
import { COLORS } from './src/utils/constants';

function AppContent() {
  const { theme, themeMode } = useTheme();
  const { isLocked, loading: authLoading } = useAuth();
  const [consented, setConsented] = useState(() => hasConsented());

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

  const renderBody = () => {
    if (!consented) {
      return <ConsentScreen onAccept={() => setConsented(true)} />;
    }
    if (authLoading) {
      return null;
    }
    if (isLocked) {
      return <LockScreen />;
    }
    return (
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    );
  };

  return (
    <PaperProvider theme={theme}>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'auto'} />
      {renderBody()}
    </PaperProvider>
  );
}

export default function App() {
  // Garante que o banco criptografado (SQLCipher) esteja aberto e migrado ANTES
  // de montar os provedores (o ThemeProvider e o consentimento leem dados no mount).
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      await initDatabase();
      await runMigrations();
      initMonetization(); // registra o RevenueCat se houver chave (senão, fica desligado)
    };
    bootstrap()
      .catch(err => console.error('Falha na inicialização do banco:', err))
      .finally(() => setDbReady(true));
  }, []);

  if (!dbReady) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.splash}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <EntitlementProvider>
              <AccountProvider>
                <AppContent />
              </AccountProvider>
            </EntitlementProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
});
