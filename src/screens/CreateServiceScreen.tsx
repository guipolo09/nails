// ============================================
// TELA DE CADASTRO/EDIÇÃO DE SERVIÇO
// ============================================

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Text, Snackbar, useTheme } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ScreenContainer, BigButton } from '../components';
import { useServices } from '../hooks';
import { COLORS, MESSAGES } from '../utils/constants';
import type { RootStackParamList } from '../types';

type CreateServiceNavigationProp = StackNavigationProp<RootStackParamList, 'CreateService'>;
type CreateServiceRouteProp = RouteProp<RootStackParamList, 'CreateService'>;

export const CreateServiceScreen: React.FC = () => {
  const navigation = useNavigation<CreateServiceNavigationProp>();
  const route = useRoute<CreateServiceRouteProp>();
  const { services, createService, updateService } = useServices();
  const theme = useTheme();

  const editingServiceId = route.params?.serviceId;
  const isEditing = !!editingServiceId;

  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    if (editingServiceId) {
      const service = services.find(s => s.id === editingServiceId);
      if (service) {
        setName(service.name);
        setDuration(service.durationMinutes.toString());
      }
    }
  }, [editingServiceId, services]);

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const validate = (): boolean => {
    if (!name.trim()) {
      showSnackbar(MESSAGES.SERVICE_NAME_REQUIRED);
      return false;
    }
    if (!duration || parseInt(duration, 10) <= 0) {
      showSnackbar(MESSAGES.SERVICE_DURATION_REQUIRED);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const durationMinutes = parseInt(duration, 10);

      let result;
      if (isEditing) {
        result = await updateService(editingServiceId, {
          name: name.trim(),
          durationMinutes,
        });
      } else {
        result = await createService({
          name: name.trim(),
          durationMinutes,
        });
      }

      if (result.success) {
        navigation.goBack();
      } else {
        showSnackbar(result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Opções predefinidas de duração
  const durationOptions = [30, 45, 60, 90, 120];

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onBackground }]}>
            {isEditing ? 'Editar Serviço' : 'Novo Serviço'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Preencha os dados do serviço
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Nome do serviço"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
            placeholder="Ex: Unha em gel"
            autoCapitalize="words"
            maxLength={50}
          />

          <TextInput
            label="Duração (minutos)"
            value={duration}
            onChangeText={text => setDuration(text.replace(/[^0-9]/g, ''))}
            mode="outlined"
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
            placeholder="Ex: 60"
            keyboardType="numeric"
            maxLength={3}
          />

          <Text style={[styles.durationLabel, { color: theme.colors.onSurfaceVariant }]}>Duração rápida:</Text>
          <View style={styles.durationOptions}>
            {durationOptions.map(min => (
              <BigButton
                key={min}
                label={`${min} min`}
                mode={duration === min.toString() ? 'contained' : 'outlined'}
                onPress={() => setDuration(min.toString())}
              />
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <BigButton
            label="Cancelar"
            mode="outlined"
            onPress={() => navigation.goBack()}
          />
          <BigButton
            label={isEditing ? 'Salvar' : 'Cadastrar'}
            icon="check"
            onPress={handleSave}
            loading={loading}
            disabled={loading}
          />
        </View>

        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
        >
          {snackbarMessage}
        </Snackbar>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  form: {
    flex: 1,
  },
  input: {
    marginBottom: 16,
  },
  durationLabel: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  durationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actions: {
    marginTop: 20,
  },
});
