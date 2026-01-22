// ============================================
// TELA DE CRIAÇÃO DE AGENDAMENTO
// Fluxo: Nome -> Serviço -> Data -> Horário
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Snackbar, Divider, TextInput, useTheme } from 'react-native-paper';
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
import { COLORS } from '../utils/constants';
import { generateTimeSlotsWithSettings, formatDateLong, calculateEndTime } from '../utils/helpers';
import type { RootStackParamList, Service, Appointment } from '../types';

type CreateScheduleNavigationProp = StackNavigationProp<RootStackParamList, 'CreateSchedule'>;

type Step = 'name' | 'service' | 'date' | 'time' | 'confirm';

export const CreateScheduleScreen: React.FC = () => {
  const navigation = useNavigation<CreateScheduleNavigationProp>();
  const { services, loading: loadingServices } = useServices();
  const { createAppointment, getAppointmentsByDate } = useAppointments();
  const { settings } = useSettings();
  const theme = useTheme();

  // Estados do fluxo
  const [currentStep, setCurrentStep] = useState<Step>('name');
  const [clientName, setClientName] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);

  // Gerar próximos 7 dias (incluindo sábados e domingos)
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

  // Carregar agendamentos do dia selecionado
  useEffect(() => {
    if (selectedDate) {
      getAppointmentsByDate(selectedDate).then(setDayAppointments);
    }
  }, [selectedDate, getAppointmentsByDate]);

  // Gerar slots de horário (com configurações dinâmicas)
  const timeSlots = useMemo(() => {
    if (!selectedDate || !selectedService) return [];
    return generateTimeSlotsWithSettings(
      selectedDate,
      dayAppointments,
      selectedService.durationMinutes,
      settings
    );
  }, [selectedDate, selectedService, dayAppointments, settings]);

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  // Handlers de navegação do fluxo
  const handleNameNext = () => {
    if (!clientName.trim()) {
      showSnackbar('Digite o nome do cliente');
      return;
    }
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
        setCurrentStep('name');
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
      const result = await createAppointment({
        clientName: clientName.trim(),
        serviceId: selectedService.id,
        date: selectedDate,
        startTime: selectedTime,
      });

      if (result.success) {
        showSnackbar(result.message);
        setTimeout(() => navigation.goBack(), 1500);
      } else {
        showSnackbar(result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Renderização condicional por etapa
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={[
        styles.step,
        currentStep === 'name' && styles.stepActive,
        currentStep !== 'name' && styles.stepCompleted,
      ]}>
        <Text style={styles.stepText}>1</Text>
      </View>
      <View style={styles.stepLine} />
      <View style={[
        styles.step,
        currentStep === 'service' && styles.stepActive,
        (currentStep === 'date' || currentStep === 'time' || currentStep === 'confirm') && styles.stepCompleted,
      ]}>
        <Text style={styles.stepText}>2</Text>
      </View>
      <View style={styles.stepLine} />
      <View style={[
        styles.step,
        currentStep === 'date' && styles.stepActive,
        (currentStep === 'time' || currentStep === 'confirm') && styles.stepCompleted,
      ]}>
        <Text style={styles.stepText}>3</Text>
      </View>
      <View style={styles.stepLine} />
      <View style={[
        styles.step,
        currentStep === 'time' && styles.stepActive,
        currentStep === 'confirm' && styles.stepCompleted,
      ]}>
        <Text style={styles.stepText}>4</Text>
      </View>
    </View>
  );

  const renderNameStep = () => (
    <>
      <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>
        Nome do cliente
      </Text>
      <TextInput
        label="Digite o nome"
        value={clientName}
        onChangeText={setClientName}
        mode="outlined"
        style={[styles.input, { backgroundColor: theme.colors.surface }]}
        autoCapitalize="words"
        maxLength={50}
        autoFocus
      />
      <BigButton
        label="Continuar"
        icon="arrow-right"
        onPress={handleNameNext}
      />
    </>
  );

  const renderServiceStep = () => (
    <>
      <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>
        Selecione o serviço
      </Text>
      {services.length === 0 ? (
        <EmptyState
          icon="nail"
          title="Nenhum serviço"
          description="Cadastre um serviço primeiro"
        />
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

  const renderDateStep = () => (
    <>
      <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>
        Selecione a data
      </Text>
      <Text style={[styles.selectedInfo, { color: theme.colors.primary }]}>
        Serviço: {selectedService?.name}
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

  const renderTimeStep = () => {
    const isHoliday = settings?.holidays.includes(selectedDate!) || false;

    return (
      <>
        <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>
          Selecione o horário
        </Text>
        <Text style={[styles.selectedInfo, { color: theme.colors.primary }]}>
          {selectedService?.name} - {formatDateLong(selectedDate!)}
        </Text>
        {isHoliday ? (
          <EmptyState
            icon="calendar-remove"
            title="Feriado"
            description="Não há atendimento neste dia"
          />
        ) : timeSlots.length === 0 ? (
          <EmptyState
            icon="clock-alert"
            title="Sem horários"
            description="Todos os horários estão ocupados"
          />
        ) : (
          <TimeSlotPicker
            slots={timeSlots}
            selectedTime={selectedTime}
            onSelectTime={handleSelectTime}
          />
        )}
      </>
    );
  };

  const renderConfirmStep = () => {
    const endTime = selectedTime && selectedService
      ? calculateEndTime(selectedTime, selectedService.durationMinutes)
      : '';

    return (
      <>
        <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>
          Confirmar agendamento
        </Text>

        <View style={[styles.confirmCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.confirmRow}>
            <Text style={[styles.confirmLabel, { color: theme.colors.onSurfaceVariant }]}>
              Cliente
            </Text>
            <Text style={[styles.confirmValue, { color: theme.colors.onSurface }]}>
              {clientName}
            </Text>
          </View>
          <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
          <View style={styles.confirmRow}>
            <Text style={[styles.confirmLabel, { color: theme.colors.onSurfaceVariant }]}>
              Serviço
            </Text>
            <Text style={[styles.confirmValue, { color: theme.colors.onSurface }]}>
              {selectedService?.name}
            </Text>
          </View>
          <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
          <View style={styles.confirmRow}>
            <Text style={[styles.confirmLabel, { color: theme.colors.onSurfaceVariant }]}>
              Data
            </Text>
            <Text style={[styles.confirmValue, { color: theme.colors.onSurface }]}>
              {formatDateLong(selectedDate!)}
            </Text>
          </View>
          <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
          <View style={styles.confirmRow}>
            <Text style={[styles.confirmLabel, { color: theme.colors.onSurfaceVariant }]}>
              Horário
            </Text>
            <Text style={[styles.confirmValue, { color: theme.colors.onSurface }]}>
              {selectedTime} às {endTime}
            </Text>
          </View>
        </View>

        <BigButton
          label="Confirmar Agendamento"
          icon="check"
          onPress={handleConfirm}
          loading={loading}
          disabled={loading}
        />
      </>
    );
  };

  if (loadingServices) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {renderStepIndicator()}

      <View style={styles.content}>
        {currentStep === 'name' && renderNameStep()}
        {currentStep === 'service' && renderServiceStep()}
        {currentStep === 'date' && renderDateStep()}
        {currentStep === 'time' && renderTimeStep()}
        {currentStep === 'confirm' && renderConfirmStep()}
      </View>

      {currentStep === 'name' ? (
        <BigButton
          label="Cancelar"
          mode="text"
          onPress={() => navigation.goBack()}
        />
      ) : (
        <BigButton
          label="Voltar"
          mode="text"
          icon="arrow-left"
          onPress={handleBack}
        />
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    backgroundColor: COLORS.primary,
  },
  stepCompleted: {
    backgroundColor: COLORS.success,
  },
  stepText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  content: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  selectedInfo: {
    fontSize: 14,
    marginBottom: 16,
    fontWeight: '500',
  },
  confirmCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  confirmLabel: {
    fontSize: 14,
  },
  confirmValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    // backgroundColor será aplicada dinamicamente
  },
  holidayText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 8,
  },
});
