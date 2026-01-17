// ============================================
// HOOK DE GERENCIAMENTO DE AGENDAMENTOS
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { appointmentRepository } from '../services/appointmentRepository';
import { createCalendarEvent, deleteCalendarEvent } from '../services/calendarService';
import type { Appointment, CreateAppointmentDTO, OperationResult } from '../types';
import { MESSAGES } from '../utils/constants';

interface UseAppointmentsReturn {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createAppointment: (data: CreateAppointmentDTO) => Promise<OperationResult<Appointment>>;
  deleteAppointment: (id: string) => Promise<OperationResult>;
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
    getAppointmentsByDate,
  };
};
