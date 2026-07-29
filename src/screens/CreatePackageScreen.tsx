// ============================================
// TELA DE CRIAÇÃO DE PACOTE
// Fluxo: Cliente → Composição → Confirmar
// ============================================

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity } from 'react-native';
import {
  Text,
  TextInput,
  Divider,
  Chip,
  IconButton,
  Snackbar,
  useTheme,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ScreenContainer, BigButton, EmptyState, LoadingState } from '../components';
import { useServices } from '../hooks';
import { usePackages } from '../hooks/usePackages';
import { clientRepository } from '../services/clientRepository';
import { formatDuration } from '../utils/helpers';
import type { RootStackParamList, Client, Service } from '../types';

type CreatePackageNavigationProp = StackNavigationProp<RootStackParamList, 'CreatePackage'>;

type Step = 'client' | 'composition' | 'confirm';

interface CompositionItem {
  service: Service;
  qty: number;
}

export const CreatePackageScreen: React.FC = () => {
  const navigation = useNavigation<CreatePackageNavigationProp>();
  const { services, loading: loadingServices } = useServices();
  const { createPackage } = usePackages();
  const theme = useTheme();

  const [currentStep, setCurrentStep] = useState<Step>('client');
  const [clientName, setClientName] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSuggestions, setClientSuggestions] = useState<Client[]>([]);
  const [composition, setComposition] = useState<CompositionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    if (clientName.trim().length >= 1) {
      setClientSuggestions(clientRepository.search(clientName));
    } else {
      setClientSuggestions(clientRepository.getAll().slice(0, 5));
    }
  }, [clientName]);

  const showSnackbar = (msg: string) => {
    setSnackbarMessage(msg);
    setSnackbarVisible(true);
  };

  const totalSlots = composition.reduce((sum, i) => sum + i.qty, 0);

  const adjustQty = (service: Service, delta: number) => {
    setComposition(prev => {
      const existing = prev.find(i => i.service.id === service.id);
      if (!existing) {
        if (delta > 0) return [...prev, { service, qty: 1 }];
        return prev;
      }
      const newQty = existing.qty + delta;
      if (newQty <= 0) return prev.filter(i => i.service.id !== service.id);
      return prev.map(i => (i.service.id === service.id ? { ...i, qty: newQty } : i));
    });
  };

  const getQty = (serviceId: string) =>
    composition.find(i => i.service.id === serviceId)?.qty ?? 0;

  const handleClientNext = () => {
    if (!clientName.trim()) {
      showSnackbar('Digite ou selecione uma cliente');
      return;
    }
    setCurrentStep('composition');
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setClientName(client.name);
    setClientSuggestions([]);
    setCurrentStep('composition');
  };

  const handleCompositionNext = () => {
    if (totalSlots === 0) {
      showSnackbar('Adicione pelo menos um serviço ao pacote');
      return;
    }
    setCurrentStep('confirm');
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Expande composição em slots individuais
      const slots = composition.flatMap(({ service, qty }) =>
        Array.from({ length: qty }, () => ({
          serviceId: service.id,
          serviceName: service.name,
          durationMinutes: service.durationMinutes,
        }))
      );

      const result = await createPackage({
        clientId: selectedClient?.id,
        clientName: clientName.trim(),
        slots,
      });

      if (result.success && result.data) {
        showSnackbar(result.message);
        setTimeout(() => {
          navigation.replace('PackageDetail', { packageId: result.data!.id });
        }, 800);
      } else {
        showSnackbar(result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 'composition') setCurrentStep('client');
    if (currentStep === 'confirm') setCurrentStep('composition');
  };

  // ---- Indicador de etapas ----
  const steps: Step[] = ['client', 'composition', 'confirm'];
  const stepLabels = ['Cliente', 'Composição', 'Confirmar'];
  const currentIndex = steps.indexOf(currentStep);

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <View
            style={[
              styles.step,
              index === currentIndex && { backgroundColor: theme.colors.primary },
              index < currentIndex && { backgroundColor: '#4CAF50' },
              index > currentIndex && { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <Text style={styles.stepText}>{index + 1}</Text>
          </View>
          {index < steps.length - 1 && (
            <View style={[styles.stepLine, { backgroundColor: theme.colors.surfaceVariant }]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  // ---- Etapa 1: Cliente ----
  const renderClientStep = () => (
    <>
      <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>Cliente</Text>
      <TextInput
        label="Nome da cliente"
        value={clientName}
        onChangeText={text => {
          setClientName(text);
          if (selectedClient && text !== selectedClient.name) setSelectedClient(null);
        }}
        mode="outlined"
        style={[styles.input, { backgroundColor: theme.colors.surface }]}
        autoCapitalize="words"
        maxLength={60}
        autoFocus
        right={
          selectedClient ? (
            <TextInput.Icon icon="check-circle" color={theme.colors.primary} />
          ) : undefined
        }
      />

      {clientSuggestions.length > 0 && (
        <View
          style={[
            styles.suggestionsBox,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
          ]}
        >
          <FlatList
            data={clientSuggestions}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <Divider />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSelectClient(item)}
              >
                <View style={styles.suggestionLeft}>
                  <Text style={[styles.suggestionName, { color: theme.colors.onSurface }]}>
                    {item.name}
                  </Text>
                  {item.phone ? (
                    <Text style={[styles.suggestionDetail, { color: theme.colors.onSurfaceVariant }]}>
                      {item.phone}
                    </Text>
                  ) : null}
                </View>
                {item.tier === 'premium' && (
                  <Chip
                    compact
                    style={[styles.premiumChip, { backgroundColor: theme.colors.primaryContainer }]}
                    textStyle={[styles.premiumChipText, { color: theme.colors.primary }]}
                  >
                    Premium
                  </Chip>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <BigButton label="Continuar" icon="arrow-right" onPress={handleClientNext} />
    </>
  );

  // ---- Etapa 2: Composição ----
  const renderCompositionStep = () => (
    <>
      <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>
        Composição do Pacote
      </Text>
      <Text style={[styles.stepSubtitle, { color: theme.colors.onSurfaceVariant }]}>
        Defina quantos horários de cada serviço o pacote inclui
      </Text>

      {loadingServices ? (
        <LoadingState />
      ) : services.length === 0 ? (
        <EmptyState icon="nail" title="Nenhum serviço" description="Cadastre um serviço primeiro" />
      ) : (
        services.map(service => {
          const qty = getQty(service.id);
          return (
            <View
              key={service.id}
              style={[
                styles.serviceRow,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: qty > 0 ? theme.colors.primary : theme.colors.outlineVariant,
                  borderWidth: qty > 0 ? 1.5 : 1,
                },
              ]}
            >
              <View style={styles.serviceInfo}>
                <Text style={[styles.serviceName, { color: theme.colors.onSurface }]}>
                  {service.name}
                </Text>
                <Text style={[styles.serviceDuration, { color: theme.colors.onSurfaceVariant }]}>
                  {formatDuration(service.durationMinutes)}
                </Text>
              </View>
              <View style={styles.qtyControls}>
                <IconButton
                  icon="minus"
                  size={18}
                  mode={qty > 0 ? 'contained-tonal' : 'outlined'}
                  onPress={() => adjustQty(service, -1)}
                  disabled={qty === 0}
                  iconColor={qty > 0 ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
                <Text style={[styles.qtyText, { color: qty > 0 ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>
                  {qty}
                </Text>
                <IconButton
                  icon="plus"
                  size={18}
                  mode="contained-tonal"
                  onPress={() => adjustQty(service, 1)}
                  iconColor={theme.colors.primary}
                />
              </View>
            </View>
          );
        })
      )}

      {totalSlots > 0 && (
        <View style={[styles.summaryBar, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text style={[styles.summaryText, { color: theme.colors.primary }]}>
            {totalSlots} horário{totalSlots !== 1 ? 's' : ''} no pacote:{' '}
            {composition.map(i => `${i.service.name} × ${i.qty}`).join(' · ')}
          </Text>
        </View>
      )}

      <BigButton
        label="Continuar"
        icon="arrow-right"
        onPress={handleCompositionNext}
        disabled={totalSlots === 0}
      />
    </>
  );

  // ---- Etapa 3: Confirmar ----
  const renderConfirmStep = () => (
    <>
      <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>Confirmar Pacote</Text>

      <View style={[styles.confirmCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.confirmRow}>
          <Text style={[styles.confirmLabel, { color: theme.colors.onSurfaceVariant }]}>
            Cliente
          </Text>
          <Text style={[styles.confirmValue, { color: theme.colors.onSurface }]}>
            {clientName}
            {selectedClient?.tier === 'premium' ? ' ★' : ''}
          </Text>
        </View>
        <Divider />
        <View style={styles.confirmRow}>
          <Text style={[styles.confirmLabel, { color: theme.colors.onSurfaceVariant }]}>
            Total de horários
          </Text>
          <Text style={[styles.confirmValue, { color: theme.colors.onSurface }]}>
            {totalSlots}
          </Text>
        </View>
        <Divider />
        {composition.map(({ service, qty }) => (
          <View key={service.id} style={styles.slotPreviewRow}>
            <View style={[styles.slotDot, { backgroundColor: theme.colors.primary }]} />
            <Text style={[styles.slotPreviewText, { color: theme.colors.onSurface }]}>
              {service.name} × {qty}
            </Text>
            <Text style={[styles.slotPreviewDuration, { color: theme.colors.onSurfaceVariant }]}>
              {formatDuration(service.durationMinutes)} cada
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.hintText, { color: theme.colors.onSurfaceVariant }]}>
        Após criar o pacote, você poderá agendar cada horário individualmente na tela de detalhes.
      </Text>

      <BigButton
        label="Criar Pacote"
        icon="package-variant-closed-check"
        onPress={handleConfirm}
        loading={loading}
        disabled={loading}
      />
    </>
  );

  return (
    <ScreenContainer>
      {renderStepIndicator()}
      <View style={styles.content}>
        {currentStep === 'client' && renderClientStep()}
        {currentStep === 'composition' && renderCompositionStep()}
        {currentStep === 'confirm' && renderConfirmStep()}
      </View>

      {currentStep === 'client' ? (
        <BigButton label="Cancelar" mode="text" onPress={() => navigation.goBack()} />
      ) : (
        <BigButton label="Voltar" mode="text" icon="arrow-left" onPress={handleBack} />
      )}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  step: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: '#FFFFFF', fontWeight: '600', fontSize: 12 },
  stepLine: { width: 32, height: 2, marginHorizontal: 4 },
  content: { flex: 1 },
  stepTitle: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  stepSubtitle: { fontSize: 13, marginBottom: 16 },
  input: { marginBottom: 8 },

  suggestionsBox: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  suggestionLeft: { flex: 1 },
  suggestionName: { fontSize: 15, fontWeight: '600' },
  suggestionDetail: { fontSize: 12, marginTop: 1 },
  premiumChip: { height: 22, justifyContent: 'center', marginLeft: 8 },
  premiumChipText: { fontSize: 9, fontWeight: '700', lineHeight: 11 },

  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 8,
    marginBottom: 8,
  },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 15, fontWeight: '600' },
  serviceDuration: { fontSize: 12, marginTop: 2 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyText: { fontSize: 16, fontWeight: '700', minWidth: 24, textAlign: 'center' },

  summaryBar: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    marginTop: 4,
  },
  summaryText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },

  confirmCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  confirmLabel: { fontSize: 13 },
  confirmValue: { fontSize: 15, fontWeight: '600' },
  slotPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  slotDot: { width: 8, height: 8, borderRadius: 4 },
  slotPreviewText: { flex: 1, fontSize: 14, fontWeight: '500' },
  slotPreviewDuration: { fontSize: 12 },

  hintText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
