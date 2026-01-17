// ============================================
// SERVIÇO DE INTEGRAÇÃO COM CALENDÁRIO
// Integração com Google Agenda via expo-calendar
// ============================================

import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import dayjs from 'dayjs';
import type { Appointment } from '../types';

/**
 * Resultado da criação de evento
 */
interface CalendarEventResult {
  success: boolean;
  eventId?: string;
  message: string;
}

/**
 * Solicita permissão de acesso ao calendário
 */
export const requestCalendarPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Erro ao solicitar permissão do calendário:', error);
    return false;
  }
};

/**
 * Verifica se tem permissão do calendário
 */
export const hasCalendarPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Erro ao verificar permissão do calendário:', error);
    return false;
  }
};

/**
 * Obtém o calendário padrão do dispositivo
 */
const getDefaultCalendarId = async (): Promise<string | null> => {
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

    if (Platform.OS === 'ios') {
      // No iOS, buscar o calendário padrão
      const defaultCalendar = calendars.find(
        cal => cal.allowsModifications && cal.source.name === 'iCloud'
      ) || calendars.find(
        cal => cal.allowsModifications
      );
      return defaultCalendar?.id || null;
    } else {
      // No Android, buscar o calendário do Google ou o primeiro disponível
      const googleCalendar = calendars.find(
        cal => cal.accessLevel === Calendar.CalendarAccessLevel.OWNER &&
               cal.source.type === 'com.google'
      );

      if (googleCalendar) {
        return googleCalendar.id;
      }

      // Fallback para qualquer calendário que permita modificações
      const writableCalendar = calendars.find(
        cal => cal.accessLevel === Calendar.CalendarAccessLevel.OWNER ||
               cal.accessLevel === Calendar.CalendarAccessLevel.ROOT
      );

      return writableCalendar?.id || null;
    }
  } catch (error) {
    console.error('Erro ao obter calendário:', error);
    return null;
  }
};

/**
 * Cria um evento no calendário do dispositivo
 */
export const createCalendarEvent = async (
  appointment: Appointment
): Promise<CalendarEventResult> => {
  try {
    // Verificar permissão
    const hasPermission = await hasCalendarPermission();
    if (!hasPermission) {
      const granted = await requestCalendarPermission();
      if (!granted) {
        return {
          success: false,
          message: 'Permissão do calendário negada',
        };
      }
    }

    // Obter calendário
    const calendarId = await getDefaultCalendarId();
    if (!calendarId) {
      return {
        success: false,
        message: 'Nenhum calendário disponível',
      };
    }

    // Criar datas de início e fim
    const [startHour, startMin] = appointment.startTime.split(':').map(Number);
    const [endHour, endMin] = appointment.endTime.split(':').map(Number);

    const startDate = dayjs(appointment.date)
      .hour(startHour)
      .minute(startMin)
      .second(0)
      .toDate();

    const endDate = dayjs(appointment.date)
      .hour(endHour)
      .minute(endMin)
      .second(0)
      .toDate();

    // Criar evento
    const eventId = await Calendar.createEventAsync(calendarId, {
      title: `💅 ${appointment.serviceName}`,
      startDate,
      endDate,
      notes: `Agendamento no salão - ${appointment.serviceName}`,
      alarms: [{ relativeOffset: -30 }], // Lembrete 30 minutos antes
    });

    return {
      success: true,
      eventId,
      message: 'Evento criado no calendário',
    };
  } catch (error) {
    console.error('Erro ao criar evento no calendário:', error);
    return {
      success: false,
      message: 'Erro ao criar evento no calendário',
    };
  }
};

/**
 * Remove um evento do calendário
 */
export const deleteCalendarEvent = async (eventId: string): Promise<boolean> => {
  try {
    const hasPermission = await hasCalendarPermission();
    if (!hasPermission) {
      return false;
    }

    await Calendar.deleteEventAsync(eventId);
    return true;
  } catch (error) {
    console.error('Erro ao remover evento do calendário:', error);
    return false;
  }
};
