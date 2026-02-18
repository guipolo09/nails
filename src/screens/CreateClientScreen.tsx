// ============================================
// TELA DE CADASTRO / EDIÇÃO DE CLIENTE
// ============================================

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import {
  Text,
  TextInput,
  SegmentedButtons,
  Snackbar,
  useTheme,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ScreenContainer, BigButton } from '../components';
import { useClients } from '../hooks/useClients';
import type { RootStackParamList } from '../types';

type CreateClientRouteProp = RouteProp<RootStackParamList, 'CreateClient'>;
type CreateClientNavigationProp = StackNavigationProp<RootStackParamList, 'CreateClient'>;

export const CreateClientScreen: React.FC = () => {
  const navigation = useNavigation<CreateClientNavigationProp>();
  const route = useRoute<CreateClientRouteProp>();
  const { clientId } = route.params ?? {};
  const { createClient, updateClient, getClientById } = useClients();
  const theme = useTheme();
  const isEditing = !!clientId;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [tier, setTier] = useState<'regular' | 'premium'>('regular');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Carrega dados se estiver editando
  useEffect(() => {
    if (clientId) {
      const client = getClientById(clientId);
      if (client) {
        setName(client.name);
        setPhone(client.phone ?? '');
        setNotes(client.notes ?? '');
        setTier(client.tier);
      }
    }
  }, [clientId, getClientById]);

  const showSnackbar = (msg: string) => {
    setSnackbarMessage(msg);
    setSnackbarVisible(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      showSnackbar('Digite o nome da cliente');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && clientId) {
        const result = updateClient(clientId, {
          name: name.trim(),
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
          tier,
        });
        if (result.success) {
          showSnackbar(result.message);
          setTimeout(() => navigation.goBack(), 1200);
        } else {
          showSnackbar(result.message);
        }
      } else {
        const result = createClient({
          name: name.trim(),
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
          tier,
        });
        if (result.success) {
          showSnackbar(result.message);
          setTimeout(() => navigation.goBack(), 1200);
        } else {
          showSnackbar(result.message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <Text
        variant="headlineSmall"
        style={[styles.title, { color: theme.colors.onBackground }]}
      >
        {isEditing ? 'Editar Cliente' : 'Nova Cliente'}
      </Text>

      <TextInput
        label="Nome *"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
        autoCapitalize="words"
        maxLength={60}
        autoFocus={!isEditing}
      />

      <TextInput
        label="Telefone (opcional)"
        value={phone}
        onChangeText={setPhone}
        mode="outlined"
        style={styles.input}
        keyboardType="phone-pad"
        maxLength={20}
      />

      <TextInput
        label="Observações (opcional)"
        value={notes}
        onChangeText={setNotes}
        mode="outlined"
        style={styles.input}
        multiline
        numberOfLines={3}
        maxLength={200}
        placeholder="Ex: alergia a acetona, prefere gel..."
      />

      <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
        Classificação
      </Text>
      <SegmentedButtons
        value={tier}
        onValueChange={value => setTier(value as 'regular' | 'premium')}
        buttons={[
          {
            value: 'regular',
            label: 'Regular',
            icon: 'account-outline',
          },
          {
            value: 'premium',
            label: 'Premium',
            icon: 'star-outline',
          },
        ]}
        style={styles.segmented}
      />

      {tier === 'premium' && (
        <Text style={[styles.premiumHint, { color: theme.colors.primary }]}>
          Clientes premium podem ter agendamentos recorrentes
        </Text>
      )}

      <View style={styles.actions}>
        <BigButton
          label={isEditing ? 'Salvar Alterações' : 'Cadastrar Cliente'}
          icon={isEditing ? 'content-save' : 'account-plus'}
          onPress={handleSave}
          loading={loading}
          disabled={loading}
        />
        <BigButton
          label="Cancelar"
          mode="text"
          onPress={() => navigation.goBack()}
        />
      </View>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
      >
        {snackbarMessage}
      </Snackbar>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: {
    fontWeight: '700',
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 4,
  },
  segmented: {
    marginBottom: 8,
  },
  premiumHint: {
    fontSize: 12,
    marginBottom: 16,
    marginLeft: 4,
  },
  actions: {
    marginTop: 8,
  },
});
