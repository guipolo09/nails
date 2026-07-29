// ============================================
// TELA DE REMARCAÇÃO DE AGENDAMENTO
// Permite mudar a data e o horário de um agendamento existente.
// ============================================

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { Text, Snackbar, Divider, useTheme, Portal, Dialog, Button } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import {
  ScreenContainer,
  BigButton,
  TimeSlotPicker,
  LoadingState,
  EmptyState,
} from '../components';
import { useAppointments, useSettings } from '../hooks';
import { appointmentRepository } from '../services/appointmentRepository';
import {
  generateTimeSlotsWithSettings,
  formatDateLong,
  formatDate,
  minutesBetween,
  calculateEndTime,
} from '../utils/helpers';
import type { RootStackParamList, Appointment } from '../types';

type Nav = StackNavigationProp<RootStackParamList, 'Reschedule'>;
type Rt = RouteProp<RootStackParamList, 'Reschedule'>;

export const RescheduleScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { appointmentId } = route.params;
  const theme = useTheme();

  const { rescheduleAppointment, getAppointmentsByDate } = useAppointments();
  const { settings, isHoliday } = useSettings();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    appointmentRepository.getById(appointmentId).then(appt => {
      if (appt) {
        setAppointment(appt);
        setSelectedDate(appt.date);
      }
    });
  }, [appointmentId]);

  // Carrega agendamentos do dia (para calcular disponibilidade)
  useEffect(() => {
    if (selectedDate) {
      getAppointmentsByDate(selectedDate).then(setDayAppointments);
      setSelectedTime(null);
    }
  }, [selectedDate, getAppointmentsByDate]);

  const durationMinutes = useMemo(
    () => (appointment ? minutesBetween(appointment.startTime, appointment.endTime) : 0),
    [appointment]
  );

  // Slots do dia, excluindo o próprio agendamento (para não marcar seu horário como ocupado)
  const timeSlots = useMemo(() => {
    if (!selectedDate || !appointment) return [];
    const others = dayAppointments.filter(a => a.id !== appointment.id);
    return generateTimeSlotsWithSettings(selectedDate, others, durationMinutes, settings);
  }, [selectedDate, appointment, dayAppointments, durationMinutes, settings]);

  const showSnackbar = (msg: string) => {
    setSnackbarMessage(msg);
    setSnackbarVisible(true);
  };

  const dateIsHoliday = selectedDate ? isHoliday(selectedDate) : false;

  const quickDates = useMemo(() => {
    return [0, 1, 2].map(offset => {
      const d = dayjs().add(offset, 'day');
      const value = d.format('YYYY-MM-DD');
      return {
        value,
        label: offset === 0 ? 'Hoje' : offset === 1 ? 'Amanhã' : formatDateLong(value),
      };
    });
  }, []);

  const handleDatePickerChange = (event: { type: string }, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date && event.type !== 'dismissed') {
      setPickerDate(date);
      setSelectedDate(dayjs(date).format('YYYY-MM-DD'));
    }
  };

  const handleConfirm = async () => {
    if (!appointment || !selectedDate || !selectedTime) {
      showSnackbar('Selecione a nova data e horário');
      return;
    }
    setLoading(true);
    try {
      const result = await rescheduleAppointment(appointment.id, {
        date: selectedDate,
        startTime: selectedTime,
      });
      showSnackbar(result.message);
      if (result.success) {
        setTimeout(() => navigation.goBack(), 1200);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!appointment) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }

  const newEndTime = selectedTime ? calculateEndTime(selectedTime, durationMinutes) : '';

  return (
    <ScreenContainer>
      {/* Agendamento atual */}
      <View style={[styles.currentCard, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.currentLabel, { color: theme.colors.onSurfaceVariant }]}>
          Agendamento atual
        </Text>
        <Text style={[styles.currentClient, { color: theme.colors.onSurface }]}>
          {appointment.clientName}
        </Text>
        <Text style={[styles.currentDetail, { color: theme.colors.onSurfaceVariant }]}>
          {appointment.serviceName} · {formatDate(appointment.date)} · {appointment.startTime}
        </Text>
      </View>

      <Divider style={styles.divider} />

      {/* Nova data */}
      <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>Nova data</Text>
      {quickDates.map(item => (
        <BigButton
          key={item.value}
          label={item.label}
          mode={selectedDate === item.value ? 'contained' : 'outlined'}
          onPress={() => setSelectedDate(item.value)}
        />
      ))}
      <BigButton
        label="Escolher outra data"
        icon="calendar"
        mode="text"
        onPress={() => {
          setPickerDate(selectedDate ? dayjs(selectedDate).toDate() : new Date());
          setShowDatePicker(true);
        }}
      />

      {selectedDate && (
        <Text style={[styles.selectedInfo, { color: theme.colors.primary }]}>
          {formatDateLong(selectedDate)}
        </Text>
      )}

      {/* Novo horário */}
      <Text style={[styles.stepTitle, { color: theme.colors.onBackground }]}>Novo horário</Text>
      {dateIsHoliday ? (
        <EmptyState icon="calendar-remove" title="Feriado" description="Não há atendimento neste dia" />
      ) : timeSlots.length === 0 ? (
        <EmptyState icon="clock-alert" title="Sem horários" description="Todos os horários estão ocupados" />
      ) : (
        <TimeSlotPicker slots={timeSlots} selectedTime={selectedTime} onSelectTime={setSelectedTime} />
      )}

      {selectedTime && (
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text style={[styles.summaryText, { color: theme.colors.primary }]}>
            Novo horário: {selectedTime} às {newEndTime}
          </Text>
        </View>
      )}

      <BigButton
        label="Confirmar remarcação"
        icon="check"
        onPress={handleConfirm}
        loading={loading}
        disabled={loading || !selectedTime || dateIsHoliday}
      />
      <BigButton label="Cancelar" mode="text" onPress={() => navigation.goBack()} />

      {/* Date picker nativo */}
      {showDatePicker && (
        <>
          <DateTimePicker
            value={pickerDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={handleDatePickerChange}
            minimumDate={new Date()}
          />
          {Platform.OS === 'ios' && (
            <Portal>
              <Dialog visible={showDatePicker} onDismiss={() => setShowDatePicker(false)}>
                <Dialog.Title>Escolher data</Dialog.Title>
                <Dialog.Content>
                  <Text>Data selecionada: {dayjs(pickerDate).format('DD/MM/YYYY')}</Text>
                </Dialog.Content>
                <Dialog.Actions>
                  <Button onPress={() => setShowDatePicker(false)}>Fechar</Button>
                </Dialog.Actions>
              </Dialog>
            </Portal>
          )}
        </>
      )}

      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000}>
        {snackbarMessage}
      </Snackbar>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  currentCard: { borderRadius: 12, padding: 16, marginBottom: 8 },
  currentLabel: { fontSize: 12, marginBottom: 4 },
  currentClient: { fontSize: 18, fontWeight: '700' },
  currentDetail: { fontSize: 14, marginTop: 2 },
  divider: { marginVertical: 12 },
  stepTitle: { fontSize: 18, fontWeight: '700', marginTop: 8, marginBottom: 12 },
  selectedInfo: { fontSize: 14, fontWeight: '500', marginTop: 4, marginBottom: 8 },
  summaryCard: { borderRadius: 12, padding: 14, marginTop: 12, marginBottom: 4 },
  summaryText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
