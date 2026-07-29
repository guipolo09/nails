// ============================================
// TELA DE BLOQUEIO
// Solicita PIN e/ou biometria para desbloquear o app.
// ============================================

import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
  verifyPin,
  isBiometricEnabled,
  isBiometricAvailable,
  authenticateBiometric,
} from '../services/authService';

export const LockScreen: React.FC = () => {
  const theme = useTheme();
  const { unlock } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [biometricOn, setBiometricOn] = useState(false);

  const tryBiometric = useCallback(async () => {
    const ok = await authenticateBiometric();
    if (ok) unlock();
  }, [unlock]);

  useEffect(() => {
    const checkBiometric = async () => {
      const [enabled, available] = await Promise.all([
        isBiometricEnabled(),
        isBiometricAvailable(),
      ]);
      const usable = enabled && available;
      setBiometricOn(usable);
      if (usable) tryBiometric();
    };
    checkBiometric();
  }, [tryBiometric]);

  const handleUnlock = async () => {
    const ok = await verifyPin(pin);
    if (ok) {
      setPin('');
      setError('');
      unlock();
    } else {
      setError('PIN incorreto');
      setPin('');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>💅</Text>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
          Nails
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Digite seu PIN para desbloquear
        </Text>

        <TextInput
          mode="outlined"
          value={pin}
          onChangeText={t => {
            setPin(t.replace(/[^0-9]/g, ''));
            setError('');
          }}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={8}
          style={styles.input}
          autoFocus
          onSubmitEditing={handleUnlock}
        />

        {error ? (
          <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>
        ) : null}

        <Button
          mode="contained"
          onPress={handleUnlock}
          disabled={pin.length < 4}
          style={styles.button}
        >
          Desbloquear
        </Button>

        {biometricOn && (
          <Button mode="text" icon="fingerprint" onPress={tryBiometric} style={styles.button}>
            Usar biometria
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emoji: { fontSize: 56, marginBottom: 8 },
  title: { fontWeight: '700', marginBottom: 4 },
  subtitle: { marginBottom: 24, textAlign: 'center' },
  input: { width: '100%', maxWidth: 260, textAlign: 'center' },
  error: { marginTop: 8 },
  button: { marginTop: 16, width: '100%', maxWidth: 260 },
});
