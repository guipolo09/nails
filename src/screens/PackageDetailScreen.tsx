// ============================================
// TELA DE DETALHES DO PACOTE
// ============================================

import React, { useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, Alert } from 'react-native';
import {
  Text,
  Chip,
  Divider,
  useTheme,
  IconButton,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ScreenContainer, BigButton, EmptyState } from '../components';
import { usePackages } from '../hooks/usePackages';
import { packageRepository } from '../services/packageRepository';
import { formatDuration } from '../utils/helpers';
import dayjs from 'dayjs';
import type { RootStackParamList, ServicePackage } from '../types';

type PackageDetailRouteProp = RouteProp<RootStackParamList, 'PackageDetail'>;
type PackageDetailNavigationProp = StackNavigationProp<RootStackParamList, 'PackageDetail'>;

export const PackageDetailScreen: React.FC = () => {
  const navigation = useNavigation<PackageDetailNavigationProp>();
  const route = useRoute<PackageDetailRouteProp>();
  const { packageId } = route.params;
  const { deletePackage, renewPackage } = usePackages();
  const theme = useTheme();

  const [pkg, setPkg] = useState<ServicePackage | null>(null);

  useFocusEffect(
    useCallback(() => {
      packageRepository.getById(packageId).then(p => {
        if (p) setPkg(p);
      });
    }, [packageId])
  );

  if (!pkg) {
    return (
      <ScreenContainer>
        <EmptyState icon="package-variant-closed" title="Pacote não encontrado" description="" />
      </ScreenContainer>
    );
  }

  const scheduled = pkg.slots.filter(s => s.status === 'scheduled').length;
  const cancelled = pkg.slots.filter(s => s.status === 'cancelled').length;
  const pending = pkg.slots.filter(s => s.status === 'pending').length;
  const total = pkg.slots.length;
  const isDone = pending === 0; // nenhum slot pendente → pacote encerrado

  const handleDeletePackage = () => {
    Alert.alert(
      'Remover Pacote',
      `Deseja remover este pacote de "${pkg.clientName}"? Os agendamentos vinculados não serão excluídos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            await deletePackage(pkg.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleRenew = () => {
    Alert.alert(
      'Renovar Pacote',
      `Criar um novo pacote idêntico para ${pkg.clientName} com os mesmos serviços?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Renovar',
          onPress: async () => {
            const result = await renewPackage(pkg);
            if (result.success && result.data) {
              navigation.replace('PackageDetail', { packageId: result.data.id });
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer padding={false} scroll={false}>
      {/* Header do pacote */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.headerTop}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
              {pkg.clientName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.clientName, { color: theme.colors.onSurface }]}>
              {pkg.clientName}
            </Text>
            <Chip
              compact
              icon={isDone ? (cancelled > 0 ? 'alert-circle' : 'check-circle') : 'clock-outline'}
              style={[
                styles.progressChip,
                {
                  backgroundColor: isDone
                    ? cancelled > 0
                      ? '#FF980022'
                      : '#4CAF5022'
                    : theme.colors.surfaceVariant,
                },
              ]}
              textStyle={[
                styles.progressChipText,
                {
                  color: isDone
                    ? cancelled > 0
                      ? '#E65100'
                      : '#2E7D32'
                    : theme.colors.onSurfaceVariant,
                },
              ]}
            >
              {scheduled}/{total} agendado{total !== 1 ? 's' : ''}
              {cancelled > 0 ? ` · ${cancelled} cancelado${cancelled !== 1 ? 's' : ''}` : ''}
            </Chip>
          </View>
          <IconButton
            icon="trash-can-outline"
            size={22}
            iconColor={theme.colors.error}
            onPress={handleDeletePackage}
          />
        </View>

        {/* Botão renovar — aparece quando não há mais slots pendentes */}
        {isDone && (
          <BigButton
            label="Renovar Pacote"
            icon="refresh"
            mode="outlined"
            onPress={handleRenew}
          />
        )}
      </View>

      <Divider />

      <FlatList
        data={pkg.slots}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
            HORÁRIOS DO PACOTE
          </Text>
        }
        renderItem={({ item, index }) => {
          const isScheduled = item.status === 'scheduled';
          const isCancelled = item.status === 'cancelled';

          const borderLeftColor = isScheduled
            ? '#4CAF50'
            : isCancelled
            ? theme.colors.error
            : theme.colors.primary;

          const borderColor = isScheduled
            ? '#4CAF5040'
            : isCancelled
            ? `${theme.colors.error}30`
            : theme.colors.outlineVariant;

          return (
            <View
              style={[
                styles.slotCard,
                {
                  backgroundColor: isCancelled
                    ? theme.colors.surfaceVariant
                    : theme.colors.surface,
                  borderColor,
                  borderLeftColor,
                  opacity: isCancelled ? 0.7 : 1,
                },
              ]}
            >
              <View style={styles.slotLeft}>
                <View style={[styles.slotIndex, { borderColor: isCancelled ? theme.colors.error : '#E91E63' }]}>
                  <Text
                    style={[
                      styles.slotIndexText,
                      { color: isCancelled ? theme.colors.error : theme.colors.primary },
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.slotInfo}>
                  <Text
                    style={[
                      styles.slotService,
                      {
                        color: isCancelled
                          ? theme.colors.onSurfaceVariant
                          : theme.colors.onSurface,
                        textDecorationLine: isCancelled ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {item.serviceName}
                  </Text>
                  <Text style={[styles.slotDuration, { color: theme.colors.onSurfaceVariant }]}>
                    {formatDuration(item.durationMinutes)}
                  </Text>
                  {isScheduled && item.date && item.startTime && (
                    <Text style={[styles.slotDateTime, { color: '#2E7D32' }]}>
                      {dayjs(item.date).format('DD/MM')} às {item.startTime}
                      {item.endTime ? ` – ${item.endTime}` : ''}
                    </Text>
                  )}
                </View>
              </View>

              {isScheduled ? (
                <Chip
                  icon="check-circle"
                  compact
                  style={[styles.statusChip, { backgroundColor: '#4CAF5022' }]}
                  textStyle={[styles.statusChipText, { color: '#2E7D32' }]}
                >
                  Agendado
                </Chip>
              ) : isCancelled ? (
                <Chip
                  icon="close-circle"
                  compact
                  style={[styles.statusChip, { backgroundColor: `${theme.colors.error}22` }]}
                  textStyle={[styles.statusChipText, { color: theme.colors.error }]}
                >
                  Cancelado
                </Chip>
              ) : (
                <BigButton
                  label="Agendar"
                  icon="calendar-plus"
                  mode="outlined"
                  onPress={() =>
                    navigation.navigate('SchedulePackageSlot', {
                      packageId: pkg.id,
                      slotId: item.id,
                    })
                  }
                />
              )}
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 16,
    paddingTop: 12,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
    gap: 6,
  },
  clientName: {
    fontSize: 20,
    fontWeight: '700',
  },
  progressChip: {
    alignSelf: 'flex-start',
    height: 26,
  },
  progressChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  slotCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slotLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slotIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  slotIndexText: {
    fontSize: 13,
    fontWeight: '700',
  },
  slotInfo: { flex: 1 },
  slotService: { fontSize: 15, fontWeight: '600' },
  slotDuration: { fontSize: 12, marginTop: 2 },
  slotDateTime: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  statusChip: {
    height: 28,
    alignSelf: 'center',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
