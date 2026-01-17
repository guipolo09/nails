// ============================================
// TELA DE LISTAGEM DE SERVIÇOS
// ============================================

import React, { useState, useCallback } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { FAB, Snackbar, Text } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  ScreenContainer,
  ServiceCard,
  EmptyState,
  LoadingState,
  ConfirmDialog,
} from '../components';
import { useServices } from '../hooks';
import { COLORS } from '../utils/constants';
import type { RootStackParamList, Service } from '../types';

type ServicesNavigationProp = StackNavigationProp<RootStackParamList, 'Services'>;

export const ServicesScreen: React.FC = () => {
  const navigation = useNavigation<ServicesNavigationProp>();
  const { services, loading, deleteService, refresh } = useServices();

  // Recarrega os dados quando a tela ganha foco
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleEdit = (service: Service) => {
    navigation.navigate('CreateService', { serviceId: service.id });
  };

  const handleDeletePress = (service: Service) => {
    setServiceToDelete(service);
    setDeleteDialogVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (serviceToDelete) {
      const result = await deleteService(serviceToDelete.id);
      showSnackbar(result.message);
    }
    setDeleteDialogVisible(false);
    setServiceToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteDialogVisible(false);
    setServiceToDelete(null);
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
      <View style={styles.header}>
        <Text style={styles.title}>Meus Serviços</Text>
        <Text style={styles.subtitle}>
          {services.length} serviço(s) cadastrado(s)
        </Text>
      </View>

      {services.length === 0 ? (
        <EmptyState
          icon="nail"
          title="Nenhum serviço cadastrado"
          description="Adicione seu primeiro serviço tocando no botão +"
        />
      ) : (
        <FlatList
          data={services}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ServiceCard
              service={item}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDeletePress(item)}
            />
          )}
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateService', {})}
        color="#FFFFFF"
      />

      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Excluir Serviço"
        message={`Tem certeza que deseja excluir "${serviceToDelete?.name}"?`}
        confirmLabel="Excluir"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        destructive
      />

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  list: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: COLORS.primary,
  },
  snackbar: {
    marginBottom: 80,
  },
});
