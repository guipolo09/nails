// ============================================
// HOOK DE GERENCIAMENTO DE AGENDAMENTOS
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { appointmentRepository } from '../services/appointmentRepository';
import type { RescheduleAppointmentDTO } from '../services/appointmentRepository';
import { packageRepository } from '../services/packageRepository';
import { createCalendarEvent, deleteCalendarEvent } from '../services/calendarService';
import {
  scheduleAppointmentReminder,
  cancelAppointmentReminder,
  hasNotificationPermissions,
  requestNotificationPermissions,
} from '../services/notificationService';
import { settingsRepository } from '../services/settingsRepository';
import type { Appointment, CreateAppointmentDTO, OperationResult } from '../types';
import { MESSAGES } from '../utils/constants';

const sortAppointments = (list: Appointment[]): Appointment[] =>
  [...list].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });

interface UseAppointmentsReturn {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createAppointment: (data: CreateAppointmentDTO) => Promise<OperationResult<Appointment>>;
  deleteAppointment: (id: string) => Promise<OperationResult>;
  deleteSeries: (groupId: string) => Promise<OperationResult>;
  rescheduleAppointment: (id: string, data: RescheduleAppointmentDTO) => Promise<OperationResult<Appointment>>;
  updateAttendanceStatus: (id: string, status: 'confirmed' | 'missed') => Promise<OperationResult>;
  updatePaymentStatus: (id: string, status: 'paid' | 'pending') => Promise<OperationResult>;
  getAppointmentsByDate: (date: string) => Promise<Appointment[]>;
}

export const useAppointments = (): UseAppointmentsReturn => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await appointmentRepository.getAll();
      setAppointments(data);
    } catch (err) {
      setError(MESSAGES.APPOINTMENT_ERROR);
      console.error('Erro ao carregar agendamentos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const createAppointment = useCallback(async (data: CreateAppointmentDTO): Promise<OperationResult<Appointment>> => {
    try {
      // Criar o agendamento
      const newAppointment = await appointmentRepository.create(data);

      // Tentar criar evento no calendário
      const calendarResult = await createCalendarEvent(newAppointment);

      // Atualizar agendamento com ID do evento do calendário
      if (calendarResult.success && calendarResult.eventId) {
        await appointmentRepository.update(newAppointment.id, {
          calendarEventId: calendarResult.eventId,
        });
        newAppointment.calendarEventId = calendarResult.eventId;
      }

      // Agendar lembrete de notificação local se habilitado
      try {
        const settings = await settingsRepository.getSettings();
        if (settings.reminderSettings.appointmentRemindersEnabled) {
          let hasPermission = await hasNotificationPermissions();
          if (!hasPermission) {
            hasPermission = await requestNotificationPermissions();
          }
          if (hasPermission) {
            await scheduleAppointmentReminder(
              newAppointment,
              settings.reminderSettings.reminderOffset
            );
          }
        }
      } catch (notifError) {
        console.error('Erro ao agendar lembrete:', notifError);
      }

      setAppointments(prev => [...prev, newAppointment].sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      }));

      const message = calendarResult.success
        ? `${MESSAGES.APPOINTMENT_CREATED} ${MESSAGES.CALENDAR_EVENT_CREATED}`
        : MESSAGES.APPOINTMENT_CREATED;

      return {
        success: true,
        data: newAppointment,
        message,
      };
    } catch (err) {
      console.error('Erro ao criar agendamento:', err);
      const errorMessage = err instanceof Error && err.message === 'Conflito de horário'
        ? MESSAGES.APPOINTMENT_CONFLICT
        : MESSAGES.APPOINTMENT_ERROR;
      return {
        success: false,
        message: errorMessage,
      };
    }
  }, []);

  const deleteAppointment = useCallback(async (id: string): Promise<OperationResult> => {
    try {
      // Buscar agendamento para obter eventId
      const appointment = appointments.find(a => a.id === id);

      // Excluir evento do calendário se existir
      if (appointment?.calendarEventId) {
        await deleteCalendarEvent(appointment.calendarEventId);
      }

      // Cancelar lembrete de notificação local
      await cancelAppointmentReminder(id);

      // Cancelar slot do pacote vinculado, se houver
      if (appointment?.packageId) {
        await packageRepository.cancelSlotByAppointmentId(id);
      }

      const success = await appointmentRepository.delete(id);
      if (!success) {
        return {
          success: false,
          message: MESSAGES.APPOINTMENT_ERROR,
        };
      }

      setAppointments(prev => prev.filter(a => a.id !== id));
      return {
        success: true,
        message: MESSAGES.APPOINTMENT_DELETED,
      };
    } catch (err) {
      console.error('Erro ao excluir agendamento:', err);
      return {
        success: false,
        message: MESSAGES.APPOINTMENT_ERROR,
      };
    }
  }, [appointments]);

  const deleteSeries = useCallback(async (groupId: string): Promise<OperationResult> => {
    try {
      const series = await appointmentRepository.getByRecurrenceGroup(groupId);
      let count = 0;
      for (const appt of series) {
        const result = await deleteAppointment(appt.id);
        if (result.success) count++;
      }
      return {
        success: count > 0,
        message: count > 0
          ? `${count} agendamento(s) da série cancelado(s)!`
          : MESSAGES.APPOINTMENT_ERROR,
      };
    } catch (err) {
      console.error('Erro ao cancelar série:', err);
      return { success: false, message: MESSAGES.APPOINTMENT_ERROR };
    }
  }, [deleteAppointment]);

  const rescheduleAppointment = useCallback(async (
    id: string,
    data: RescheduleAppointmentDTO
  ): Promise<OperationResult<Appointment>> => {
    try {
      const oldEventId = appointments.find(a => a.id === id)?.calendarEventId;

      // Remarca (recalcula término, valida conflito e invalida o evento antigo)
      const updated = await appointmentRepository.reschedule(id, data);

      // Atualiza o evento no calendário: remove o antigo e cria o novo
      if (oldEventId) {
        await deleteCalendarEvent(oldEventId);
      }
      const calendarResult = await createCalendarEvent(updated);
      if (calendarResult.success && calendarResult.eventId) {
        await appointmentRepository.update(id, { calendarEventId: calendarResult.eventId });
        updated.calendarEventId = calendarResult.eventId;
      }

      // Reagenda a notificação local
      try {
        await cancelAppointmentReminder(id);
        const settings = await settingsRepository.getSettings();
        if (settings.reminderSettings.appointmentRemindersEnabled) {
          let hasPermission = await hasNotificationPermissions();
          if (!hasPermission) {
            hasPermission = await requestNotificationPermissions();
          }
          if (hasPermission) {
            await scheduleAppointmentReminder(updated, settings.reminderSettings.reminderOffset);
          }
        }
      } catch (notifError) {
        console.error('Erro ao reagendar lembrete:', notifError);
      }

      setAppointments(prev =>
        sortAppointments(prev.map(a => (a.id === id ? updated : a)))
      );

      return { success: true, data: updated, message: 'Agendamento remarcado com sucesso!' };
    } catch (err) {
      console.error('Erro ao remarcar agendamento:', err);
      const errorMessage = err instanceof Error && err.message === 'Conflito de horário'
        ? MESSAGES.APPOINTMENT_CONFLICT
        : MESSAGES.APPOINTMENT_ERROR;
      return { success: false, message: errorMessage };
    }
  }, [appointments]);

  const updateAttendanceStatus = useCallback(async (
    id: string,
    status: 'confirmed' | 'missed'
  ): Promise<OperationResult> => {
    try {
      const updated = await appointmentRepository.update(id, { attendanceStatus: status });
      if (!updated) {
        return { success: false, message: 'Agendamento não encontrado' };
      }
      setAppointments(prev =>
        prev.map(a => a.id === id ? { ...a, attendanceStatus: status } : a)
      );
      return {
        success: true,
        message: status === 'confirmed' ? 'Presença confirmada!' : 'Falta registrada!',
      };
    } catch (err) {
      console.error('Erro ao atualizar status de presença:', err);
      return { success: false, message: 'Erro ao atualizar agendamento' };
    }
  }, []);

  const updatePaymentStatus = useCallback(async (
    id: string,
    status: 'paid' | 'pending'
  ): Promise<OperationResult> => {
    try {
      const updated = await appointmentRepository.update(id, { paymentStatus: status });
      if (!updated) {
        return { success: false, message: 'Agendamento não encontrado' };
      }
      setAppointments(prev =>
        prev.map(a => (a.id === id ? { ...a, paymentStatus: status } : a))
      );
      return {
        success: true,
        message: status === 'paid' ? 'Pagamento registrado!' : 'Marcado como pendente',
      };
    } catch (err) {
      console.error('Erro ao atualizar pagamento:', err);
      return { success: false, message: 'Erro ao atualizar pagamento' };
    }
  }, []);

  const getAppointmentsByDate = useCallback(async (date: string): Promise<Appointment[]> => {
    return appointmentRepository.getByDate(date);
  }, []);

  return {
    appointments,
    loading,
    error,
    refresh: loadAppointments,
    createAppointment,
    deleteAppointment,
    deleteSeries,
    rescheduleAppointment,
    updateAttendanceStatus,
    updatePaymentStatus,
    getAppointmentsByDate,
  };
};
