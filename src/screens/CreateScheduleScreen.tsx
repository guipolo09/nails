// ============================================
// TELA DE CRIAÇÃO DE AGENDAMENTO
// Fluxo: Cliente -> Serviço -> Data -> Horário -> Confirmar
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity } from 'react-native';
import {
  Text,
  Snackbar,
  Divider,
  TextInput,
  Switch,
  SegmentedButtons,
  Chip,
  useTheme,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import dayjs from 'dayjs';
import {
  ScreenContainer,
  BigButton,
  ServiceCard,
  TimeSlotPicker,
  LoadingState,
  EmptyState,
} from '../components';
import { useServices, useAppointments, useSettings } from '../hooks';
import { clientRepository } from '../services/clientRepository';
import { COLORS } from '../utils/constants';
import { generateTimeSlotsWithSettings, formatDateLong, calculateEndTime } from '../utils/helpers';
import { generateId } from '../utils/helpers';
import type { RootStackParamList, Service, Appointment, Client, RecurrenceInterval, RecurrenceOptions } from '../types';

type CreateScheduleNavigationProp = StackNavigationProp<RootStackParamList, 'CreateSchedule'>;

type Step = 'client' | 'service' | 'date' | 'time' | 'confirm';

const RECURRENCE_OPTIONS: { value: RecurrenceInterval; label: string }[] = [
  { value: 'weekly',   label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: '3weeks',   label: '3 Semanas' },
  { value: 'monthly',  label: 'Mensal' },
];

const RECURRENCE_COUNTS = [2, 3, 4, 6];

const RECURRENCE_DAYS: Record<RecurrenceInterval, number> = {
  weekly:   7,
  biweekly: 14,
  '3weeks': 21,
  monthly:  28,
};

export const CreateScheduleScreen: React.FC = () => {
  const navigation = useNavigation<CreateScheduleNavigationProp>();
  const { services, loading: loadingServices } = useServices();
  const { createAppointment } = useAppointments();
  const { settings } = useSettings();
  const theme = useTheme();

  // Fluxo
  const [currentStep, setCurrentStep] = useState<Step>('client');

  // Dados do agendamento
  const [clientName, setClientName] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Recorrência
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>('biweekly');
  const [recurrenceCount, setRecurrenceCount] = useState(4);

  // UI
  const [clientSuggestions, setClientSuggestions] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);

  const { getAppointmentsByDate } = useAppointments();

  // Busca clientes ao digitar
  useEffect(() => {
    if (clientName.trim().length >= 1) {
      setClientSuggestions(clientRepository.search(clientName));
    } else {
      setClientSuggestions(clientRepository.getAll().slice(0, 5));
    }
  }, [clientName]);

  // Próximos 7 dias disponíveis
  const availableDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = dayjs().add(i, 'day');
      const dateString = date.format('YYYY-MM-DD');
      const isHoliday = settings?.holidays.includes(dateString) || false;
      dates.push({
        value: dateString,
        label: i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : formatDateLong(dateString),
        weekday: date.format('ddd'),
        isHoliday,
      });
    }
    return dates;
  }, [settings]);

  // Carrega agendamentos do dia
  useEffect(() => {
    if (selectedDate) {
      getAppointmentsByDate(selectedDate).then(setDayAppointments);
    }
  }, [selectedDate, getAppointmentsByDate]);

  // Slots de horário
  const timeSlots = useMemo(() => {
    if (!selectedDate || !selectedService) return [];
    return generateTimeSlotsWithSettings(
      selectedDate,
      dayAppointments,
      selectedService.durationMinutes,
      settings
    );
  }, [selectedDate, selectedService, dayAppointments, settings]);

  // Datas que serão geradas pela recorrência
  const recurrenceDates = useMemo(() => {
    if (!selectedDate || !recurrenceEnabled) return [];
    const days = RECURRENCE_DAYS[recurrenceInterval];
    return Array.from({ length: recurrenceCount }, (_, i) =>
      dayjs(selectedDate).add((i + 1) * days, 'day').format('YYYY-MM-DD')
    );
  }, [selectedDate, recurrenceEnabled, recurrenceInterval, recurrenceCount]);

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  // ---- Handlers de navegação ----

  const handleClientNext = () => {
    if (!clientName.trim()) {
      showSnackbar('Digite ou selecione uma cliente');
      return;
    }
    setCurrentStep('service');
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setClientName(client.name);
    setClientSuggestions([]);
    setCurrentStep('service');
  };

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setCurrentStep('date');
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setCurrentStep('time');
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    setCurrentStep('confirm');
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'service':
        setCurrentStep('client');
        break;
      case 'date':
        setCurrentStep('service');
        setSelectedService(null);
        break;
      case 'time':
        setCurrentStep('date');
        setSelectedDate(null);
        break;
      case 'confirm':
        setCurrentStep('time');
        setSelectedTime(null);
        break;
    }
  };

  const handleConfirm = async () => {
    if (!clientName.trim() || !selectedService || !selectedDate || !selectedTime) {
      showSnackbar('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const groupId = recurrenceEnabled ? generateId() : undefined;
      const allDates = [selectedDate, ...recurrenceDates];
      const datesToCreate = recurrenceEnabled ? allDates : [selectedDate];

      let successCount = 0;
      let lastMessage = '';

      for (const date of datesToCreate) {
        const result = await createAppointment({
          clientName: clientName.trim(),
          clientId: selectedClient?.id,
          serviceId: selectedService.id,
          date,
          startTime: selectedTime,
          recurrenceGroupId: groupId,
        });
        if (result.success) {
          successCount++;
          lastMessage = result.message;
        }
      }

      if (successCount > 0) {
        const msg = recurrenceEnabled
          ? `${successCount} agendamento(s) criado(s) com sucesso!`
          : lastMessage;
        showSnackbar(msg);
        setTimeout(() => navigation.goBack(), 1500);
      } else {
        showSnackbar('Não foi possível criar os agendamentos');
      }
    } finally {
      setLoading(false);
    }
  };

  // ---- Indicador de etapas ----

  const renderStepIndicator = () => {
    const steps: Step[] = ['client', 'service', 'date', 'time', 'confirm'];
    const currentIndex = steps.indexOf(currentStep);
    return (
      <View style={styles.stepIndicator}>
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <View style={[
              styles.step,
              index === currentIndex && styles.stepActive,
              index < currentIndex && styles.stepCompleted,
            ]}>
              <Text style={styles.stepText}>{index + 1}</Text>
            </View>
            {index < steps.length - 1 && <View style={styles.stepLine} />}
          </React.Fragment>
        ))}
      </View>
    );
  };

  // ---- Etapa 1: Seleção de cliente ----

  const renderClientStep = () => (
    <>
      <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>
        Cliente
      </Text>
      <TextInput
        label="Nome da cliente"
        value={clientName}
        onChangeText={text => {
          setClientName(text);
          if (selectedClient && text !== selectedClient.name) {
            setSelectedClient(null);
          }
        }}
        mode="outlined"
        style={[styles.input, { backgroundColor: theme.colors.surface }]}
        autoCapitalize="words"
        maxLength={60}
        autoFocus
        right={selectedClient ? <TextInput.Icon icon="check-circle" color={theme.colors.primary} /> : undefined}
      />

      {clientSuggestions.length > 0 && (
        <View style={[styles.suggestionsBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
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

      <BigButton
        label="Continuar"
        icon="arrow-right"
        onPress={handleClientNext}
      />
    </>
  );

  // ---- Etapa 2: Serviço ----

  const renderServiceStep = () => (
    <>
      <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>
        Serviço
      </Text>
      {services.length === 0 ? (
        <EmptyState icon="nail" title="Nenhum serviço" description="Cadastre um serviço primeiro" />
      ) : (
        services.map(item => (
          <ServiceCard
            key={item.id}
            service={item}
            selectable
            selected={selectedService?.id === item.id}
            onSelect={() => handleSelectService(item)}
          />
        ))
      )}
    </>
  );

  // ---- Etapa 3: Data ----

  const renderDateStep = () => (
    <>
      <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>
        Data
      </Text>
      <Text style={[styles.selectedInfo, { color: theme.colors.primary }]}>
        {selectedService?.name}
      </Text>
      {availableDates.map(item => (
        <View key={item.value}>
          <BigButton
            label={item.isHoliday ? `${item.label} (Feriado)` : item.label}
            mode={selectedDate === item.value ? 'contained' : 'outlined'}
            onPress={() => handleSelectDate(item.value)}
            disabled={item.isHoliday}
          />
          {item.isHoliday && (
            <Text style={[styles.holidayText, { color: theme.colors.error }]}>
              Sem atendimento neste dia
            </Text>
          )}
        </View>
      ))}
    </>
  );

  // ---- Etapa 4: Horário ----

  const renderTimeStep = () => {
    const isHoliday = settings?.holidays.includes(selectedDate!) || false;
    return (
      <>
        <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>
          Horário
        </Text>
        <Text style={[styles.selectedInfo, { color: theme.colors.primary }]}>
          {selectedService?.name} · {formatDateLong(selectedDate!)}
        </Text>
        {isHoliday ? (
          <EmptyState icon="calendar-remove" title="Feriado" description="Não há atendimento neste dia" />
        ) : timeSlots.length === 0 ? (
          <EmptyState icon="clock-alert" title="Sem horários" description="Todos os horários estão ocupados" />
        ) : (
          <TimeSlotPicker slots={timeSlots} selectedTime={selectedTime} onSelectTime={handleSelectTime} />
        )}
      </>
    );
  };

  // ---- Etapa 5: Confirmar ----

  const renderConfirmStep = () => {
    const endTime = selectedTime && selectedService
      ? calculateEndTime(selectedTime, selectedService.durationMinutes)
      : '';

    return (
      <>
        <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>
          Confirmar
        </Text>

        <View style={[styles.confirmCard, { backgroundColor: theme.colors.surface }]}>
          <ConfirmRow label="Cliente" value={clientName} premium={selectedClient?.tier === 'premium'} />
          <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />
          <ConfirmRow label="Serviço" value={selectedService?.name ?? ''} />
          <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />
          <ConfirmRow label="Data" value={formatDateLong(selectedDate!)} />
          <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />
          <ConfirmRow label="Horário" value={`${selectedTime} às ${endTime}`} />
        </View>

        {/* Opção de recorrência */}
        <View style={[styles.recurrenceCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
          <View style={styles.recurrenceToggleRow}>
            <View style={styles.recurrenceToggleLeft}>
              <Text style={[styles.recurrenceToggleTitle, { color: theme.colors.onSurface }]}>
                Repetir agendamento
              </Text>
              <Text style={[styles.recurrenceToggleSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                Criar série de agendamentos automáticos
              </Text>
            </View>
            <Switch
              value={recurrenceEnabled}
              onValueChange={setRecurrenceEnabled}
            />
          </View>

          {recurrenceEnabled && (
            <>
              <Divider style={{ backgroundColor: theme.colors.outlineVariant, marginVertical: 12 }} />

              <Text style={[styles.recurrenceLabel, { color: theme.colors.onSurfaceVariant }]}>
                Frequência
              </Text>
              <SegmentedButtons
                value={recurrenceInterval}
                onValueChange={v => setRecurrenceInterval(v as RecurrenceInterval)}
                buttons={RECURRENCE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                style={styles.segmented}
              />

              <Text style={[styles.recurrenceLabel, { color: theme.colors.onSurfaceVariant }]}>
                Repetições (além do 1º)
              </Text>
              <View style={styles.countRow}>
                {RECURRENCE_COUNTS.map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.countChip,
                      {
                        backgroundColor: recurrenceCount === n
                          ? theme.colors.primary
                          : theme.colors.surfaceVariant,
                        borderColor: recurrenceCount === n
                          ? theme.colors.primary
                          : theme.colors.outlineVariant,
                      },
                    ]}
                    onPress={() => setRecurrenceCount(n)}
                  >
                    <Text style={{
                      color: recurrenceCount === n ? '#FFFFFF' : theme.colors.onSurfaceVariant,
                      fontWeight: '700',
                      fontSize: 14,
                    }}>
                      {n}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.recurrenceSummary, { color: theme.colors.primary }]}>
                {recurrenceCount + 1} agendamentos no total:{'\n'}
                {[selectedDate!, ...recurrenceDates]
                  .map(d => dayjs(d).format('DD/MM'))
                  .join(' · ')}
              </Text>
            </>
          )}
        </View>

        <BigButton
          label={recurrenceEnabled
            ? `Confirmar ${recurrenceCount + 1} Agendamentos`
            : 'Confirmar Agendamento'}
          icon="check"
          onPress={handleConfirm}
          loading={loading}
          disabled={loading}
        />
      </>
    );
  };

  if (loadingServices) {
    return <ScreenContainer><LoadingState /></ScreenContainer>;
  }

  return (
    <ScreenContainer>
      {renderStepIndicator()}
      <View style={styles.content}>
        {currentStep === 'client'  && renderClientStep()}
        {currentStep === 'service' && renderServiceStep()}
        {currentStep === 'date'    && renderDateStep()}
        {currentStep === 'time'    && renderTimeStep()}
        {currentStep === 'confirm' && renderConfirmStep()}
      </View>

      {currentStep === 'client' ? (
        <BigButton label="Cancelar" mode="text" onPress={() => navigation.goBack()} />
      ) : (
        <BigButton label="Voltar" mode="text" icon="arrow-left" onPress={handleBack} />
      )}

      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000}>
        {snackbarMessage}
      </Snackbar>
    </ScreenContainer>
  );
};

// ---- Sub-componente linha de confirmação ----
const ConfirmRow: React.FC<{ label: string; value: string; premium?: boolean }> = ({ label, value, premium }) => {
  const theme = useTheme();
  return (
    <View style={styles.confirmRow}>
      <Text style={[styles.confirmLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <View style={styles.confirmValueRow}>
        {premium && (
          <Chip
            compact
            style={[styles.premiumChip, { backgroundColor: theme.colors.primaryContainer }]}
            textStyle={[styles.premiumChipText, { color: theme.colors.primary }]}
          >
            Premium
          </Chip>
        )}
        <Text style={[styles.confirmValue, { color: theme.colors.onSurface }]}>{value}</Text>
      </View>
    </View>
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
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: { backgroundColor: COLORS.primary },
  stepCompleted: { backgroundColor: COLORS.success },
  stepText: { color: '#FFFFFF', fontWeight: '600', fontSize: 12 },
  stepLine: { width: 24, height: 2, backgroundColor: COLORS.border, marginHorizontal: 3 },
  content: { flex: 1 },
  stepTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  input: { marginBottom: 8 },
  selectedInfo: { fontSize: 14, marginBottom: 16, fontWeight: '500' },

  // Sugestões de clientes
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

  holidayText: { fontSize: 12, textAlign: 'center', marginTop: -8, marginBottom: 8 },

  // Confirm
  confirmCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  confirmValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  confirmLabel: { fontSize: 13 },
  confirmValue: { fontSize: 15, fontWeight: '600' },

  // Recorrência
  recurrenceCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  recurrenceToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recurrenceToggleLeft: { flex: 1, marginRight: 12 },
  recurrenceToggleTitle: { fontSize: 15, fontWeight: '600' },
  recurrenceToggleSubtitle: { fontSize: 12, marginTop: 2 },
  recurrenceLabel: { fontSize: 12, marginBottom: 8, marginTop: 4 },
  segmented: { marginBottom: 12 },
  countRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  countChip: {
    width: 52,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recurrenceSummary: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
  },
});
