// ============================================
// TELA DE PROFISSIONAIS (CRUD)
// ============================================

import React, { useState } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import {
  Text,
  List,
  Switch,
  FAB,
  Portal,
  Dialog,
  TextInput,
  Button,
  IconButton,
  Snackbar,
  useTheme,
} from 'react-native-paper';
import { ScreenContainer, EmptyState, LoadingState, ConfirmDialog } from '../components';
import { useProfessionals } from '../hooks';
import type { Professional } from '../types';

export const ProfessionalsScreen: React.FC = () => {
  const theme = useTheme();
  const { professionals, loading, createProfessional, updateProfessional, deleteProfessional } =
    useProfessionals();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState<Professional | null>(null);
  const [name, setName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Professional | null>(null);
  const [snackbar, setSnackbar] = useState('');

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDialogVisible(true);
  };

  const openEdit = (p: Professional) => {
    setEditing(p);
    setName(p.name);
    setDialogVisible(true);
  };

  const handleSave = () => {
    const result = editing
      ? updateProfessional(editing.id, { name })
      : createProfessional({ name });
    setSnackbar(result.message);
    if (result.success) setDialogVisible(false);
  };

  const handleToggleActive = (p: Professional) => {
    updateProfessional(p.id, { active: !p.active });
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      const result = deleteProfessional(deleteTarget.id);
      setSnackbar(result.message);
    }
    setDeleteTarget(null);
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
      {professionals.length === 0 ? (
        <EmptyState
          icon="account-tie"
          title="Nenhum profissional"
          description="Cadastre as profissionais do salão para ter agendas separadas"
        />
      ) : (
        <FlatList
          data={professionals}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              description={item.active ? 'Ativa' : 'Inativa'}
              left={props => <List.Icon {...props} icon="account" />}
              right={() => (
                <View style={styles.itemActions}>
                  <Switch value={item.active} onValueChange={() => handleToggleActive(item)} />
                  <IconButton icon="pencil" size={20} onPress={() => openEdit(item)} />
                  <IconButton
                    icon="delete"
                    size={20}
                    iconColor={theme.colors.error}
                    onPress={() => setDeleteTarget(item)}
                  />
                </View>
              )}
            />
          )}
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#FFFFFF"
        onPress={openCreate}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? 'Editar profissional' : 'Nova profissional'}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Nome"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancelar</Button>
            <Button onPress={handleSave}>Salvar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Remover profissional"
        message={`Deseja remover "${deleteTarget?.name}"? Os agendamentos existentes mantêm o nome registrado.`}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={3000}>
        {snackbar}
      </Snackbar>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  list: { padding: 12, paddingBottom: 100 },
  itemActions: { flexDirection: 'row', alignItems: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 20 },
});
