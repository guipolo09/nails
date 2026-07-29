// ============================================
// TELA DE ASSINATURA (PAYWALL)
// Mostra os benefícios PRO e os planos (mensal/anual). Enquanto a monetização
// não estiver configurada, exibe um estado informativo ("em breve").
// ============================================

import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Button, List, Divider, Snackbar, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../components';
import { useEntitlement } from '../context/EntitlementContext';
import { PRO_FEATURE_LABELS, type ProFeature } from '../monetization/config';
import type { PlanOption } from '../monetization/types';

const FEATURES = Object.keys(PRO_FEATURE_LABELS) as ProFeature[];

export const PaywallScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { monetizationActive, isPro, plans, loading, purchase, restore } = useEntitlement();
  const [busy, setBusy] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  const handlePurchase = async (plan: PlanOption) => {
    setBusy(true);
    const result = await purchase(plan);
    setBusy(false);
    setSnackbar(result.message);
    if (result.success) setTimeout(() => navigation.goBack(), 1200);
  };

  const handleRestore = async () => {
    setBusy(true);
    const result = await restore();
    setBusy(false);
    setSnackbar(result.message);
    if (result.success) setTimeout(() => navigation.goBack(), 1200);
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.emoji}>✨</Text>
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
            Nails PRO
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Tudo do plano gratuito, sem limites, mais os recursos para o salão crescer.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          {FEATURES.map(f => (
            <List.Item
              key={f}
              title={PRO_FEATURE_LABELS[f]}
              left={props => <List.Icon {...props} icon="check-circle" color={theme.colors.primary} />}
              titleStyle={styles.featureTitle}
            />
          ))}
        </View>

        {isPro && monetizationActive ? (
          <View style={[styles.activeCard, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text style={[styles.activeText, { color: theme.colors.primary }]}>
              Você já é PRO. Aproveite! 💖
            </Text>
          </View>
        ) : !monetizationActive ? (
          <View style={[styles.activeCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.infoTitle, { color: theme.colors.onSurface }]}>
              Assinatura em preparação
            </Text>
            <Text style={[styles.infoBody, { color: theme.colors.onSurfaceVariant }]}>
              Os planos ainda não estão disponíveis nesta versão. Todos os recursos estão
              liberados por enquanto.
            </Text>
          </View>
        ) : (
          <>
            <Divider style={styles.divider} />
            <Text style={[styles.plansTitle, { color: theme.colors.onBackground }]}>
              Escolha seu plano
            </Text>
            {loading ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>Carregando planos…</Text>
            ) : (
              plans.map(plan => (
                <Button
                  key={plan.id}
                  mode="contained"
                  onPress={() => handlePurchase(plan)}
                  disabled={busy}
                  style={styles.planButton}
                  contentStyle={styles.planButtonContent}
                >
                  {plan.title} · {plan.priceString}
                  {plan.period === 'annual' ? ' (melhor valor)' : ''}
                </Button>
              ))
            )}
            <Button mode="text" onPress={handleRestore} disabled={busy} style={styles.restore}>
              Restaurar compras
            </Button>
          </>
        )}
      </ScrollView>

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={3000}>
        {snackbar}
      </Snackbar>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingVertical: 16 },
  emoji: { fontSize: 44, marginBottom: 4 },
  title: { fontWeight: '700' },
  subtitle: { textAlign: 'center', marginTop: 6, fontSize: 14, lineHeight: 20 },
  card: { borderRadius: 12, paddingVertical: 4, marginTop: 8 },
  featureTitle: { fontSize: 15 },
  activeCard: { borderRadius: 12, padding: 16, marginTop: 16 },
  activeText: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  infoTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  infoBody: { fontSize: 14, lineHeight: 20 },
  divider: { marginVertical: 16 },
  plansTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  planButton: { marginBottom: 10, borderRadius: 8 },
  planButtonContent: { height: 48 },
  restore: { marginTop: 4 },
});
