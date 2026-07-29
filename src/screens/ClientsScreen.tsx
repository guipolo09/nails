// ============================================
// TELA DE CLIENTES
// ============================================

import React, { useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, Alert } from 'react-native';
import {
  Text,
  FAB,
  Searchbar,
  Chip,
  List,
  IconButton,
  Divider,
  Portal,
  Modal,
  useTheme,
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ScreenContainer, EmptyState, LoadingState, BigButton } from '../components';
import { useClients } from '../hooks/useClients';
import { clientRepository } from '../services/clientRepository';
import type { RootStackParamList, Client } from '../types';

type ClientsNavigationProp = StackNavigationProp<RootStackParamList, 'Clients'>;

export const ClientsScreen: React.FC = () => {
  const navigation = useNavigation<ClientsNavigationProp>();
  const { clients, loading, loadClients, deleteClient } = useClients();
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewClient, setViewClient] = useState<Client | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [loadClients])
  );

  const filteredClients = searchQuery.trim()
    ? clientRepository.search(searchQuery)
    : clients;

  const handleDelete = (client: Client) => {
    Alert.alert(
      'Remover Cliente',
      `Deseja remover "${client.name}"? Os agendamentos existentes não serão excluídos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => deleteClient(client.id),
        },
      ]
    );
  };

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padding={false} scroll={false}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar cliente..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchbar, { backgroundColor: theme.colors.surface }]}
          inputStyle={{ fontSize: 15 }}
        />
      </View>

      {filteredClients.length === 0 ? (
        <EmptyState
          icon="account-group-outline"
          title="Nenhuma cliente"
          description={
            searchQuery
              ? 'Nenhuma cliente encontrada'
              : 'Cadastre sua primeira cliente tocando no botão +'
          }
        />
      ) : (
        <FlatList
          data={filteredClients}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <Divider />}
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              description={
                item.phone
                  ? item.phone + (item.notes ? ` · ${item.notes}` : '')
                  : item.notes || undefined
              }
              descriptionNumberOfLines={1}
              left={() => (
                <View style={styles.avatarContainer}>
                  <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  {item.tier === 'premium' && (
                    <View style={[styles.premiumDot, { backgroundColor: theme.colors.primary }]} />
                  )}
                </View>
              )}
              right={() => (
                <View style={styles.actionsRow}>
                  {item.tier === 'premium' && (
                    <Chip
                      compact
                      style={[styles.premiumChip, { backgroundColor: theme.colors.primaryContainer }]}
                      textStyle={[styles.premiumChipText, { color: theme.colors.primary }]}
                    >
                      Premium
                    </Chip>
                  )}
                  <IconButton
                    icon="pencil-outline"
                    size={20}
                    iconColor={theme.colors.onSurfaceVariant}
                    onPress={() => navigation.navigate('CreateClient', { clientId: item.id })}
                  />
                  <IconButton
                    icon="trash-can-outline"
                    size={20}
                    iconColor={theme.colors.error}
                    onPress={() => handleDelete(item)}
                  />
                </View>
              )}
              titleStyle={styles.clientName}
              onPress={() => setViewClient(item)}
            />
          )}
        />
      )}

      <View style={styles.countContainer}>
        <Text style={[styles.countText, { color: theme.colors.onSurfaceVariant }]}>
          {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''}
          {filteredClients.filter(c => c.tier === 'premium').length > 0
            ? ` · ${filteredClients.filter(c => c.tier === 'premium').length} premium`
            : ''}
        </Text>
      </View>

      <FAB
        icon="account-plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('CreateClient', {})}
        color="#FFFFFF"
      />

      {/* Modal de visualização da cliente */}
      <Portal>
        <Modal
          visible={viewClient !== null}
          onDismiss={() => setViewClient(null)}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
        >
          {viewClient && (
            <View>
              <View style={styles.modalHeader}>
                <View style={[styles.modalAvatar, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text style={[styles.modalAvatarText, { color: theme.colors.primary }]}>
                    {viewClient.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.modalHeaderInfo}>
                  <Text style={[styles.modalName, { color: theme.colors.onSurface }]}>
                    {viewClient.name}
                  </Text>
                  {viewClient.tier === 'premium' && (
                    <Chip
                      compact
                      style={[styles.premiumChip, { backgroundColor: theme.colors.primaryContainer }]}
                      textStyle={[styles.premiumChipText, { color: theme.colors.primary }]}
                    >
                      Premium
                    </Chip>
                  )}
                </View>
              </View>

              <Divider />

              <List.Item
                title={viewClient.phone ?? 'Sem telefone'}
                description="Telefone"
                left={props => <List.Icon {...props} icon="phone-outline" />}
                titleStyle={!viewClient.phone ? { color: theme.colors.onSurfaceVariant } : undefined}
              />

              {viewClient.notes ? (
                <List.Item
                  title={viewClient.notes}
                  description="Observações"
                  left={props => <List.Icon {...props} icon="note-text-outline" />}
                  titleNumberOfLines={4}
                />
              ) : null}

              <List.Item
                title={viewClient.tier === 'premium' ? 'Premium' : 'Regular'}
                description="Classificação"
                left={props => <List.Icon {...props} icon={viewClient.tier === 'premium' ? 'star' : 'account-outline'} />}
                titleStyle={{ color: viewClient.tier === 'premium' ? theme.colors.primary : theme.colors.onSurface }}
              />

              <Divider style={{ marginBottom: 8 }} />

              <View style={styles.modalActions}>
                <BigButton
                  label="Editar"
                  icon="pencil-outline"
                  onPress={() => {
                    setViewClient(null);
                    navigation.navigate('CreateClient', { clientId: viewClient.id });
                  }}
                />
                <BigButton
                  label="Fechar"
                  mode="text"
                  onPress={() => setViewClient(null)}
                />
              </View>
            </View>
          )}
        </Modal>
      </Portal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchbar: {
    borderRadius: 12,
    elevation: 0,
  },
  list: {
    paddingBottom: 100,
  },
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginRight: 4,
    position: 'relative',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  premiumDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumChip: {
    height: 24,
    justifyContent: 'center',
  },
  premiumChipText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  clientName: {
    fontWeight: '600',
    fontSize: 16,
  },
  countContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 8,
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
  },

  // Modal de visualização
  modalContainer: {
    marginHorizontal: 24,
    borderRadius: 16,
    overflow: 'hidden',
    paddingTop: 20,
  },
  modalHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarText: {
    fontSize: 28,
    fontWeight: '700',
  },
  modalHeaderInfo: {
    alignItems: 'center',
    gap: 4,
  },
  modalName: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalActions: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
