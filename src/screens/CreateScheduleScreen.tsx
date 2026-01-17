// ============================================
// TELA DE CRIAÇÃO DE AGENDAMENTO
// Fluxo: Nome -> Serviço -> Data -> Horário
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Snackbar, Divider, TextInput } from 'react-native-paper';
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
import { useServices, useAppointments } from '../hooks';
import { COLORS, MESSAGES } from '../utils/constants';
import { generateTimeSlots, formatDateLong, calculateEndTime } from '../utils/helpers';
import type { RootStackParamList, Service, Appointment } from '../types';

type CreateScheduleNavigationProp = StackNavigationProp<RootStackParamList, 'CreateSchedule'>;

type Step = 'name' | 'service' | 'date' | 'time' | 'confirm';

export const CreateScheduleScreen: React.FC = () => {
  const navigation = useNavigation<CreateScheduleNavigationProp>();
  const { services, loading: loadingServices } = useServices();
  const { createAppointment, getAppointmentsByDate } = useAppointments();

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
      dates.push({
        value: date.format('YYYY-MM-DD'),
        label: i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : formatDateLong(date.format('YYYY-MM-DD')),
        weekday: date.format('ddd'),
      });
    }
    return dates;
  }, []);

  // Carregar agendamentos do dia selecionado
  useEffect(() => {
    if (selectedDate) {
      getAppointmentsByDate(selectedDate).then(setDayAppointments);
    }
  }, [selectedDate, getAppointmentsByDate]);

  // Gerar slots de horário
  const timeSlots = useMemo(() => {
    if (!selectedDate || !selectedService) return [];
    return generateTimeSlots(selectedDate, dayAppointments, selectedService.durationMinutes);
  }, [selectedDate, selectedService, dayAppointments]);

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
      <Text style={styles.stepTitle}>Nome do cliente</Text>
      <TextInput
        label="Digite o nome"
        value={clientName}
        onChangeText={setClientName}
        mode="outlined"
        style={styles.input}
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
      <Text style={styles.stepTitle}>Selecione o serviço</Text>
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
      <Text style={styles.stepTitle}>Selecione a data</Text>
      <Text style={styles.selectedInfo}>
        Serviço: {selectedService?.name}
      </Text>
      {availableDates.map(item => (
        <BigButton
          key={item.value}
          label={item.label}
          mode={selectedDate === item.value ? 'contained' : 'outlined'}
          onPress={() => handleSelectDate(item.value)}
        />
      ))}
    </>
  );

  const renderTimeStep = () => (
    <>
      <Text style={styles.stepTitle}>Selecione o horário</Text>
      <Text style={styles.selectedInfo}>
        {selectedService?.name} - {formatDateLong(selectedDate!)}
      </Text>
      <TimeSlotPicker
        slots={timeSlots}
        selectedTime={selectedTime}
        onSelectTime={handleSelectTime}
      />
    </>
  );

  const renderConfirmStep = () => {
    const endTime = selectedTime && selectedService
      ? calculateEndTime(selectedTime, selectedService.durationMinutes)
      : '';

    return (
      <>
        <Text style={styles.stepTitle}>Confirmar agendamento</Text>

        <View style={styles.confirmCard}>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>Cliente</Text>
            <Text style={styles.confirmValue}>{clientName}</Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>Serviço</Text>
            <Text style={styles.confirmValue}>{selectedService?.name}</Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>Data</Text>
            <Text style={styles.confirmValue}>{formatDateLong(selectedDate!)}</Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>Horário</Text>
            <Text style={styles.confirmValue}>
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
    color: COLORS.text,
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: COLORS.surface,
  },
  selectedInfo: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 16,
    fontWeight: '500',
  },
  confirmCard: {
    backgroundColor: COLORS.surface,
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
    color: COLORS.textSecondary,
  },
  confirmValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  divider: {
    backgroundColor: COLORS.border,
  },
});
