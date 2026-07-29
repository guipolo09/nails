// ============================================
// TELA DE RELATÓRIOS / DASHBOARD
// Faturamento, serviços mais vendidos, taxa de faltas e ranking de clientes.
// ============================================

import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, SegmentedButtons, Divider, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { ScreenContainer, LoadingState, EmptyState } from '../components';
import { useAppointments } from '../hooks';
import { formatCurrency } from '../utils/helpers';
import {
  filterByPeriod,
  revenueSummary,
  revenueByService,
  topClients,
  noShowStats,
  type ReportRow,
} from '../utils/reports';

type Period = 'month' | '30d' | 'all';

export const DashboardScreen: React.FC = () => {
  const theme = useTheme();
  const { appointments, loading, refresh } = useAppointments();
  const [period, setPeriod] = useState<Period>('month');

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const rows: ReportRow[] = useMemo(
    () =>
      appointments.map(a => ({
        date: a.date,
        serviceName: a.serviceName,
        clientName: a.clientName,
        priceCents: a.priceCents,
        attendanceStatus: a.attendanceStatus,
        paymentStatus: a.paymentStatus,
      })),
    [appointments]
  );

  const filtered = useMemo(() => {
    if (period === 'all') return rows;
    const end = dayjs().format('YYYY-MM-DD');
    const start =
      period === 'month'
        ? dayjs().startOf('month').format('YYYY-MM-DD')
        : dayjs().subtract(30, 'day').format('YYYY-MM-DD');
    return filterByPeriod(rows, start, end);
  }, [rows, period]);

  const summary = useMemo(() => revenueSummary(filtered), [filtered]);
  const byService = useMemo(() => revenueByService(filtered).slice(0, 5), [filtered]);
  const clients = useMemo(() => topClients(filtered, 5), [filtered]);
  const noShow = useMemo(() => noShowStats(filtered), [filtered]);

  const maxServiceTotal = byService.length > 0 ? Math.max(...byService.map(s => s.totalCents)) : 0;

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SegmentedButtons
          value={period}
          onValueChange={v => setPeriod(v as Period)}
          buttons={[
            { value: 'month', label: 'Este mês' },
            { value: '30d', label: '30 dias' },
            { value: 'all', label: 'Tudo' },
          ]}
          style={styles.segmented}
        />

        {/* Faturamento */}
        <View style={styles.cardsRow}>
          <View style={[styles.metricCard, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text style={[styles.metricLabel, { color: theme.colors.primary }]}>Faturamento</Text>
            <Text style={[styles.metricValue, { color: theme.colors.primary }]}>
              {formatCurrency(summary.totalCents)}
            </Text>
            <Text style={[styles.metricSub, { color: theme.colors.onSurfaceVariant }]}>
              {summary.count} atendimento(s)
            </Text>
          </View>
        </View>

        <View style={styles.cardsRow}>
          <View style={[styles.metricCardSmall, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.metricLabelSmall, { color: '#2E7D32' }]}>Recebido</Text>
            <Text style={[styles.metricValueSmall, { color: theme.colors.onSurface }]}>
              {formatCurrency(summary.receivedCents)}
            </Text>
          </View>
          <View style={[styles.metricCardSmall, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.metricLabelSmall, { color: '#E65100' }]}>A receber</Text>
            <Text style={[styles.metricValueSmall, { color: theme.colors.onSurface }]}>
              {formatCurrency(summary.pendingCents)}
            </Text>
          </View>
        </View>

        {/* Taxa de faltas */}
        <View style={[styles.noShowCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Presença
          </Text>
          <Text style={[styles.noShowText, { color: theme.colors.onSurfaceVariant }]}>
            {noShow.total === 0
              ? 'Sem presenças registradas no período'
              : `${noShow.attended} compareceram · ${noShow.missed} faltaram · ${Math.round(
                  noShow.rate * 100
                )}% de faltas`}
          </Text>
        </View>

        <Divider style={styles.divider} />

        {/* Serviços mais vendidos */}
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Serviços mais vendidos
        </Text>
        {byService.length === 0 ? (
          <EmptyState icon="chart-bar" title="Sem dados" description="Nenhum atendimento no período" />
        ) : (
          byService.map(s => (
            <View key={s.serviceName} style={styles.barRow}>
              <View style={styles.barHeader}>
                <Text style={[styles.barLabel, { color: theme.colors.onSurface }]} numberOfLines={1}>
                  {s.serviceName}
                </Text>
                <Text style={[styles.barValue, { color: theme.colors.onSurfaceVariant }]}>
                  {formatCurrency(s.totalCents)} · {s.count}x
                </Text>
              </View>
              <View style={[styles.barTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: theme.colors.primary,
                      width: `${maxServiceTotal > 0 ? (s.totalCents / maxServiceTotal) * 100 : 0}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))
        )}

        <Divider style={styles.divider} />

        {/* Ranking de clientes */}
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Melhores clientes
        </Text>
        {clients.length === 0 ? (
          <EmptyState icon="account-group" title="Sem dados" description="Nenhum atendimento no período" />
        ) : (
          clients.map((c, index) => (
            <View key={c.clientName} style={styles.clientRow}>
              <Text style={[styles.clientRank, { color: theme.colors.primary }]}>{index + 1}º</Text>
              <Text style={[styles.clientName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                {c.clientName}
              </Text>
              <Text style={[styles.clientValue, { color: theme.colors.onSurfaceVariant }]}>
                {formatCurrency(c.totalCents)} · {c.count}x
              </Text>
            </View>
          ))
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  segmented: { marginVertical: 12 },
  cardsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  metricCard: { flex: 1, borderRadius: 14, padding: 16 },
  metricLabel: { fontSize: 13, fontWeight: '600' },
  metricValue: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  metricSub: { fontSize: 12, marginTop: 2 },
  metricCardSmall: { flex: 1, borderRadius: 12, padding: 14 },
  metricLabelSmall: { fontSize: 12, fontWeight: '700' },
  metricValueSmall: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  noShowCard: { borderRadius: 12, padding: 16, marginTop: 4, marginBottom: 8 },
  noShowText: { fontSize: 14, marginTop: 4 },
  divider: { marginVertical: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  barRow: { marginBottom: 14 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  barValue: { fontSize: 12 },
  barTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5, minWidth: 4 },
  clientRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  clientRank: { fontSize: 14, fontWeight: '800', width: 32 },
  clientName: { fontSize: 15, fontWeight: '600', flex: 1 },
  clientValue: { fontSize: 13 },
  bottomSpace: { height: 24 },
});
