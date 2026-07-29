// ============================================
// TELA DE CONTA E SINCRONIZAÇÃO
// Login por telefone (OTP) + status de backup na nuvem.
// Enquanto nenhum provedor estiver conectado, exibe o estado "não configurado".
// ============================================

import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  List,
  Divider,
  Snackbar,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { ScreenContainer } from '../components';
import { useAccount } from '../context/AccountContext';

export const AccountScreen: React.FC = () => {
  const theme = useTheme();
  const {
    configured,
    session,
    syncEnabled,
    pendingCount,
    loading,
    syncing,
    requestOtp,
    verifyOtp,
    signOut,
    syncNow,
    refresh,
  } = useAccount();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  const showSnackbar = (msg: string) => setSnackbar(msg);

  const handleRequestOtp = async () => {
    setBusy(true);
    const result = await requestOtp(phone.trim());
    setBusy(false);
    showSnackbar(result.message);
    if (result.success) setOtpSent(true);
  };

  const handleVerifyOtp = async () => {
    setBusy(true);
    const result = await verifyOtp(phone.trim(), code.trim());
    setBusy(false);
    showSnackbar(result.message);
    if (result.success) {
      setOtpSent(false);
      setCode('');
    }
  };

  const handleSync = async () => {
    const result = await syncNow();
    showSnackbar(result.message);
  };

  const handleSignOut = async () => {
    await signOut();
    setPhone('');
    setCode('');
    setOtpSent(false);
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Estado: provedor de nuvem ainda não conectado */}
        {!configured && (
          <View style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Backup na nuvem ainda não configurado
            </Text>
            <Text style={[styles.cardBody, { color: theme.colors.onSurfaceVariant }]}>
              O app está funcionando 100% no seu aparelho. Para ativar backup automático e
              sincronizar entre dispositivos, é preciso conectar um provedor de nuvem. A
              estrutura já está pronta — veja as instruções técnicas em
              docs/backend/README.md.
            </Text>
            <Text style={[styles.pending, { color: theme.colors.primary }]}>
              {pendingCount > 0
                ? `${pendingCount} mudança(s) aguardando envio (serão enviadas quando conectar).`
                : 'Suas alterações serão enfileiradas assim que a sincronização for ativada.'}
            </Text>
          </View>
        )}

        {/* Estado: configurado, sem sessão → login por telefone */}
        {configured && !session && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
              Entrar com telefone
            </Text>
            <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
              Enviaremos um código por SMS para confirmar seu número.
            </Text>

            <TextInput
              mode="outlined"
              label="Telefone (ex.: +55 11 99999-9999)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={styles.input}
              disabled={otpSent}
            />

            {!otpSent ? (
              <Button
                mode="contained"
                onPress={handleRequestOtp}
                loading={busy}
                disabled={busy || phone.trim().length < 8}
                style={styles.button}
              >
                Enviar código
              </Button>
            ) : (
              <>
                <TextInput
                  mode="outlined"
                  label="Código recebido por SMS"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  style={styles.input}
                />
                <Button
                  mode="contained"
                  onPress={handleVerifyOtp}
                  loading={busy}
                  disabled={busy || code.trim().length < 4}
                  style={styles.button}
                >
                  Confirmar e conectar
                </Button>
                <Button mode="text" onPress={() => setOtpSent(false)}>
                  Trocar número
                </Button>
              </>
            )}
          </View>
        )}

        {/* Estado: sessão ativa → status e ações de sincronização */}
        {configured && session && (
          <>
            <List.Section>
              <List.Subheader>Conta</List.Subheader>
              <List.Item
                title="Telefone"
                description={session.phone}
                left={props => <List.Icon {...props} icon="phone" />}
              />
              <List.Item
                title="Sincronização"
                description={syncEnabled ? 'Ativada' : 'Desativada'}
                left={props => <List.Icon {...props} icon="cloud-sync" />}
              />
              <List.Item
                title="Mudanças pendentes"
                description={`${pendingCount} aguardando envio`}
                left={props => <List.Icon {...props} icon="upload" />}
                onPress={refresh}
              />
            </List.Section>

            <Divider />

            <View style={styles.section}>
              <Button
                mode="contained"
                icon="sync"
                onPress={handleSync}
                loading={syncing}
                disabled={syncing}
                style={styles.button}
              >
                Sincronizar agora
              </Button>
              <Button
                mode="outlined"
                icon="logout"
                onPress={handleSignOut}
                style={styles.button}
              >
                Sair da conta
              </Button>
            </View>
          </>
        )}
      </ScrollView>

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={3500}>
        {snackbar}
      </Snackbar>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 12, padding: 16, margin: 8 },
  cardTitle: { fontWeight: '700', marginBottom: 8 },
  cardBody: { fontSize: 14, lineHeight: 21 },
  pending: { fontSize: 13, fontWeight: '600', marginTop: 12 },
  section: { padding: 12 },
  sectionTitle: { fontWeight: '700', marginBottom: 4 },
  hint: { fontSize: 13, marginBottom: 12 },
  input: { marginBottom: 12 },
  button: { marginTop: 8 },
});
