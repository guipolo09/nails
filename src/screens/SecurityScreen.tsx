// ============================================
// TELA DE SEGURANÇA E PRIVACIDADE
// Bloqueio (PIN/biometria) + direitos LGPD (exportar dados, política).
// ============================================

import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import {
  Text,
  List,
  Switch,
  Divider,
  Button,
  Portal,
  Dialog,
  TextInput,
  HelperText,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ScreenContainer } from '../components';
import { useAuth } from '../context/AuthContext';
import { useEntitlement } from '../context/EntitlementContext';
import {
  isLockEnabled,
  setPin,
  disableLock,
  isBiometricEnabled,
  isBiometricAvailable,
  setBiometricEnabled,
} from '../services/authService';
import { exportAllData } from '../services/dataPrivacyService';
import { getConsentDate } from '../services/consentService';
import { APP_VERSION } from '../utils/constants';
import { formatDate } from '../utils/helpers';
import type { RootStackParamList } from '../types';

type Nav = StackNavigationProp<RootStackParamList, 'Security'>;

export const SecurityScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { refreshLockConfig } = useAuth();
  const { isPro } = useEntitlement();

  const [lockOn, setLockOn] = useState(false);
  const [biometricOn, setBiometricOn] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Dialog de PIN
  const [pinDialogVisible, setPinDialogVisible] = useState(false);
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [pinError, setPinError] = useState('');

  const load = async () => {
    const [lock, bio, bioAvail] = await Promise.all([
      isLockEnabled(),
      isBiometricEnabled(),
      isBiometricAvailable(),
    ]);
    setLockOn(lock);
    setBiometricOn(bio);
    setBiometricAvailable(bioAvail);
  };

  useEffect(() => {
    load();
  }, []);

  const openPinDialog = () => {
    setPin1('');
    setPin2('');
    setPinError('');
    setPinDialogVisible(true);
  };

  const handleToggleLock = (value: boolean) => {
    if (value) {
      openPinDialog();
    } else {
      Alert.alert('Desativar bloqueio', 'Tem certeza que deseja desativar o bloqueio do app?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desativar',
          style: 'destructive',
          onPress: async () => {
            await disableLock();
            await refreshLockConfig();
            await load();
          },
        },
      ]);
    }
  };

  const handleConfirmPin = async () => {
    if (pin1.length < 4) {
      setPinError('O PIN deve ter ao menos 4 dígitos');
      return;
    }
    if (pin1 !== pin2) {
      setPinError('Os PINs não coincidem');
      return;
    }
    await setPin(pin1);
    await refreshLockConfig();
    await load();
    setPinDialogVisible(false);
  };

  const handleToggleBiometric = async (value: boolean) => {
    await setBiometricEnabled(value);
    setBiometricOn(value);
  };

  const handleExport = async () => {
    if (!isPro) {
      navigation.navigate('Paywall');
      return;
    }
    try {
      setExporting(true);
      await exportAllData(APP_VERSION);
    } catch (err) {
      console.error('Erro ao exportar dados:', err);
      Alert.alert('Erro', 'Não foi possível exportar os dados.');
    } finally {
      setExporting(false);
    }
  };

  const consentDate = getConsentDate();

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Bloqueio */}
        <List.Section>
          <List.Subheader>Bloqueio do Aplicativo</List.Subheader>
          <List.Item
            title="Exigir PIN ao abrir"
            description="Protege os dados das clientes com um código de acesso"
            left={props => <List.Icon {...props} icon="lock" />}
            right={() => <Switch value={lockOn} onValueChange={handleToggleLock} />}
          />
          {lockOn && (
            <>
              <List.Item
                title="Alterar PIN"
                left={props => <List.Icon {...props} icon="lock-reset" />}
                onPress={openPinDialog}
              />
              <List.Item
                title="Desbloquear com biometria"
                description={
                  biometricAvailable
                    ? 'Usar impressão digital / rosto'
                    : 'Nenhuma biometria configurada no aparelho'
                }
                left={props => <List.Icon {...props} icon="fingerprint" />}
                right={() => (
                  <Switch
                    value={biometricOn}
                    onValueChange={handleToggleBiometric}
                    disabled={!biometricAvailable}
                  />
                )}
              />
            </>
          )}
        </List.Section>

        <Divider />

        {/* Privacidade / LGPD */}
        <List.Section>
          <List.Subheader>Privacidade (LGPD)</List.Subheader>
          <List.Item
            title="Exportar meus dados"
            description="Baixe todos os dados em formato JSON"
            left={props => <List.Icon {...props} icon="download" />}
            onPress={handleExport}
            disabled={exporting}
          />
          <List.Item
            title="Política de Privacidade"
            left={props => <List.Icon {...props} icon="shield-account" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          {consentDate && (
            <View style={styles.consentInfo}>
              <Text style={styles.consentText}>
                Consentimento registrado em {formatDate(consentDate)}
              </Text>
            </View>
          )}
        </List.Section>
      </ScrollView>

      {/* Dialog de definição de PIN */}
      <Portal>
        <Dialog visible={pinDialogVisible} onDismiss={() => setPinDialogVisible(false)}>
          <Dialog.Title>Definir PIN</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Novo PIN (mín. 4 dígitos)"
              value={pin1}
              onChangeText={t => setPin1(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
              style={styles.dialogInput}
            />
            <TextInput
              mode="outlined"
              label="Confirmar PIN"
              value={pin2}
              onChangeText={t => setPin2(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
              style={styles.dialogInput}
            />
            {pinError ? <HelperText type="error">{pinError}</HelperText> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPinDialogVisible(false)}>Cancelar</Button>
            <Button onPress={handleConfirmPin}>Salvar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  dialogInput: { marginBottom: 12 },
  consentInfo: { paddingHorizontal: 16, paddingVertical: 8 },
  consentText: { fontSize: 12, color: '#757575' },
});
