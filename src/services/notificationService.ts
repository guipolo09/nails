// ============================================
// SERVIÇO DE NOTIFICAÇÕES LOCAIS
// Gerencia lembretes de agendamentos e lembretes diários
// ============================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import dayjs from 'dayjs';
import type { Appointment, ReminderOffset } from '../types';

const APPOINTMENT_NOTIFICATION_PREFIX = 'appointment_';
const DAILY_MORNING_NOTIFICATION_ID = 'daily_morning_reminder';
const DAILY_EVENING_NOTIFICATION_ID = 'daily_evening_reminder';

/**
 * Configura o handler de exibição de notificações
 * Deve ser chamado antes de qualquer agendamento
 */
export const setupNotificationHandler = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};

/**
 * Configura o canal de notificações no Android
 */
export const setupNotificationChannel = async (): Promise<void> => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Nails Calendar',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E91E63',
    });
  }
};

/**
 * Solicita permissão para enviar notificações
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Erro ao solicitar permissão de notificações:', error);
    return false;
  }
};

/**
 * Verifica se o app tem permissão para notificações
 */
export const hasNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Erro ao verificar permissão de notificações:', error);
    return false;
  }
};

/**
 * Agenda um lembrete para um agendamento específico
 */
export const scheduleAppointmentReminder = async (
  appointment: Appointment,
  offset: ReminderOffset
): Promise<void> => {
  try {
    const [hour, minute] = appointment.startTime.split(':').map(Number);
    let triggerDate: dayjs.Dayjs;

    if (offset === 'day_before') {
      // Lembrete às 9h do dia anterior
      triggerDate = dayjs(appointment.date)
        .subtract(1, 'day')
        .hour(9)
        .minute(0)
        .second(0);
    } else {
      triggerDate = dayjs(appointment.date)
        .hour(hour)
        .minute(minute)
        .second(0)
        .subtract(offset, 'minute');
    }

    // Não agendamos notificações no passado
    if (triggerDate.isBefore(dayjs())) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      identifier: `${APPOINTMENT_NOTIFICATION_PREFIX}${appointment.id}`,
      content: {
        title: '💅 Lembrete de Agendamento',
        body: `${appointment.clientName} — ${appointment.serviceName} às ${appointment.startTime}`,
        data: { appointmentId: appointment.id },
      },
      trigger: {
        date: triggerDate.toDate(),
      },
    });
  } catch (error) {
    console.error('Erro ao agendar lembrete de agendamento:', error);
  }
};

/**
 * Cancela o lembrete de um agendamento específico
 */
export const cancelAppointmentReminder = async (appointmentId: string): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(
      `${APPOINTMENT_NOTIFICATION_PREFIX}${appointmentId}`
    );
  } catch (error) {
    console.error('Erro ao cancelar lembrete de agendamento:', error);
  }
};

/**
 * Agenda o lembrete matinal diário (1h antes do início do expediente)
 */
export const scheduleDailyMorningReminder = async (businessStartHour: number): Promise<void> => {
  try {
    const triggerHour = Math.max(0, businessStartHour - 1);

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_MORNING_NOTIFICATION_ID,
      content: {
        title: '💅 Agendamentos do Dia',
        body: 'Toque para ver todos os seus agendamentos de hoje',
        data: { type: 'daily_morning' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: triggerHour,
        minute: 0,
      },
    });
  } catch (error) {
    console.error('Erro ao agendar lembrete matinal:', error);
  }
};

/**
 * Cancela o lembrete matinal diário
 */
export const cancelDailyMorningReminder = async (): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_MORNING_NOTIFICATION_ID);
  } catch (error) {
    console.error('Erro ao cancelar lembrete matinal:', error);
  }
};

/**
 * Agenda o lembrete noturno diário (1h após o término do expediente)
 */
export const scheduleDailyEveningReminder = async (businessEndHour: number): Promise<void> => {
  try {
    const triggerHour = Math.min(23, businessEndHour + 1);

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_EVENING_NOTIFICATION_ID,
      content: {
        title: '💅 Agendamentos de Amanhã',
        body: 'Toque para ver todos os seus agendamentos de amanhã',
        data: { type: 'daily_evening' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: triggerHour,
        minute: 0,
      },
    });
  } catch (error) {
    console.error('Erro ao agendar lembrete noturno:', error);
  }
};

/**
 * Cancela o lembrete noturno diário
 */
export const cancelDailyEveningReminder = async (): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_EVENING_NOTIFICATION_ID);
  } catch (error) {
    console.error('Erro ao cancelar lembrete noturno:', error);
  }
};

/**
 * Retorna o label de exibição para cada offset de lembrete
 */
export const getReminderOffsetLabel = (offset: ReminderOffset): string => {
  switch (offset) {
    case 5:         return '5 minutos antes';
    case 30:        return '30 minutos antes';
    case 60:        return '1 hora antes';
    case 120:       return '2 horas antes';
    case 'day_before': return 'No dia anterior (às 9h)';
  }
};
