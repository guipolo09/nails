// ============================================
// TELA DE LISTA DE PACOTES
// ============================================

import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, FlatList, Alert } from 'react-native';
import {
  Text,
  FAB,
  Card,
  Chip,
  IconButton,
  Divider,
  SegmentedButtons,
  useTheme,
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ScreenContainer, EmptyState, LoadingState } from '../components';
import { usePackages } from '../hooks/usePackages';
import type { RootStackParamList, ServicePackage } from '../types';

type PackagesNavigationProp = StackNavigationProp<RootStackParamList, 'Packages'>;

const getPackageSummary = (pkg: ServicePackage): string => {
  const countByService: Record<string, { name: string; count: number }> = {};
  pkg.slots.forEach(s => {
    if (!countByService[s.serviceId]) {
      countByService[s.serviceId] = { name: s.serviceName, count: 0 };
    }
    countByService[s.serviceId].count++;
  });
  return Object.values(countByService)
    .map(({ name, count }) => `${name} × ${count}`)
    .join(' · ');
};

/** Pacote "ativo" = tem pelo menos um slot pendente */
const isActive = (pkg: ServicePackage) => pkg.slots.some(s => s.status === 'pending');

type Tab = 'active' | 'history';

export const PackagesScreen: React.FC = () => {
  const navigation = useNavigation<PackagesNavigationProp>();
  const { packages, loading, loadPackages, deletePackage } = usePackages();
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>('active');

  useFocusEffect(
    useCallback(() => {
      loadPackages();
    }, [loadPackages])
  );

  const handleDelete = (pkg: ServicePackage) => {
    Alert.alert(
      'Remover Pacote',
      `Deseja remover o pacote de "${pkg.clientName}"? Os agendamentos existentes não serão excluídos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => deletePackage(pkg.id),
        },
      ]
    );
  };

  const { activePackages, historyPackages } = useMemo(() => ({
    activePackages: packages.filter(isActive),
    historyPackages: packages.filter(p => !isActive(p)),
  }), [packages]);

  const displayed = tab === 'active' ? activePackages : historyPackages;

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }

  const renderCard = ({ item }: { item: ServicePackage }) => {
    const scheduled = item.slots.filter(s => s.status === 'scheduled').length;
    const cancelled = item.slots.filter(s => s.status === 'cancelled').length;
    const total = item.slots.length;
    const pending = item.slots.filter(s => s.status === 'pending').length;
    const isComplete = pending === 0 && cancelled === 0;
    const hasCancelled = cancelled > 0;

    return (
      <Card
        style={styles.card}
        mode="elevated"
        onPress={() => navigation.navigate('PackageDetail', { packageId: item.id })}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardTop}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                {item.clientName.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.cardInfo}>
              <Text style={[styles.clientName, { color: theme.colors.onSurface }]}>
                {item.clientName}
              </Text>
              <Text
                style={[styles.summary, { color: theme.colors.onSurfaceVariant }]}
                numberOfLines={1}
              >
                {getPackageSummary(item)}
              </Text>
            </View>

            <IconButton
              icon="trash-can-outline"
              size={20}
              iconColor={theme.colors.error}
              onPress={() => handleDelete(item)}
            />
          </View>

          <View style={styles.cardBottom}>
            {/* Chip de progresso */}
            <Chip
              compact
              icon={isComplete ? 'check-circle' : hasCancelled ? 'alert-circle' : 'clock-outline'}
              style={[
                styles.progressChip,
                {
                  backgroundColor: isComplete
                    ? '#4CAF5022'
                    : hasCancelled
                    ? '#FF980022'
                    : theme.colors.surfaceVariant,
                },
              ]}
              textStyle={[
                styles.progressChipText,
                {
                  color: isComplete
                    ? '#2E7D32'
                    : hasCancelled
                    ? '#E65100'
                    : theme.colors.onSurfaceVariant,
                },
              ]}
            >
              {scheduled}/{total} agendado{total !== 1 ? 's' : ''}
              {hasCancelled ? ` · ${cancelled} cancelado${cancelled !== 1 ? 's' : ''}` : ''}
            </Chip>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScreenContainer padding={false} scroll={false}>
      <View style={[styles.tabWrapper, { borderBottomColor: theme.colors.outlineVariant }]}>
        <SegmentedButtons
          value={tab}
          onValueChange={v => setTab(v as Tab)}
          style={styles.tabs}
          buttons={[
            {
              value: 'active',
              label: `Ativos${activePackages.length ? ` (${activePackages.length})` : ''}`,
              icon: 'package-variant-closed',
            },
            {
              value: 'history',
              label: `Histórico${historyPackages.length ? ` (${historyPackages.length})` : ''}`,
              icon: 'history',
            },
          ]}
        />
      </View>

      {displayed.length === 0 ? (
        <EmptyState
          icon={tab === 'active' ? 'package-variant-closed' : 'history'}
          title={tab === 'active' ? 'Nenhum pacote ativo' : 'Nenhum histórico'}
          description={
            tab === 'active'
              ? 'Crie um pacote de serviços tocando no botão +'
              : 'Pacotes finalizados aparecerão aqui'
          }
        />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <Divider style={styles.divider} />}
          renderItem={renderCard}
        />
      )}

      <FAB
        icon="package-variant-plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('CreatePackage')}
        color="#FFFFFF"
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  tabWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabs: {
    // ocupa largura disponível
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  divider: {
    height: 8,
    backgroundColor: 'transparent',
  },
  card: {
    borderRadius: 12,
  },
  cardContent: {
    paddingVertical: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
  },
  summary: {
    fontSize: 13,
    marginTop: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    marginTop: 10,
  },
  progressChip: {
    height: 26,
    alignSelf: 'flex-start',
  },
  progressChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
  },
});
