// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

import dayjs from 'dayjs';
import { BUSINESS_HOURS } from './constants';
import type { TimeSlot, Appointment, AppSettings, RecurrenceInterval, WeeklyHours } from '../types';

/**
 * Gera um ID único (compatível com React Native)
 * Combina timestamp com valores aleatórios para garantir unicidade
 */
export const generateId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}-${randomPart2}`;
};

/**
 * Formata data para exibição (DD/MM/YYYY)
 */
export const formatDate = (date: string): string => {
  return dayjs(date).format('DD/MM/YYYY');
};

/**
 * Formata data para exibição por extenso
 */
export const formatDateLong = (date: string): string => {
  const d = dayjs(date);
  const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return `${weekdays[d.day()]}, ${d.date()} de ${months[d.month()]}`;
};

/**
 * Formata horário para exibição (HH:mm)
 */
export const formatTime = (time: string): string => {
  return time;
};

/**
 * Formata um valor em centavos para moeda brasileira (ex.: 4500 → "R$ 45,00").
 */
export const formatCurrency = (cents: number | null | undefined): string => {
  const value = (cents ?? 0) / 100;
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
};

/**
 * Converte um texto de preço digitado (ex.: "45", "45,50", "45.50") para centavos.
 * Retorna undefined se vazio/ inválido.
 */
export const parsePriceToCents = (text: string): number | undefined => {
  const cleaned = text.trim().replace(/\s/g, '').replace(',', '.');
  if (!cleaned) return undefined;
  const value = Number(cleaned);
  if (!isFinite(value) || value < 0) return undefined;
  return Math.round(value * 100);
};

/**
 * Formata duração em minutos para texto legível
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}min`;
};

/**
 * Calcula o horário de término baseado no início e duração
 */
export const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDate = dayjs().hour(hours).minute(minutes);
  const endDate = startDate.add(durationMinutes, 'minute');
  return endDate.format('HH:mm');
};

/**
 * Gera slots de horário para um dia
 * Versão legada (usa configurações padrão)
 */
export const generateTimeSlots = (
  date: string,
  appointments: Appointment[],
  serviceDuration: number
): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const { START, END, SLOT_INTERVAL } = BUSINESS_HOURS;

  // Filtrar agendamentos do dia
  const dayAppointments = appointments.filter(a => a.date === date);

  // Gerar slots de 30 em 30 minutos
  for (let hour = START; hour < END; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_INTERVAL) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const endTime = calculateEndTime(time, serviceDuration);

      // Verificar se o slot termina dentro do horário de funcionamento
      const [endHour] = endTime.split(':').map(Number);
      if (endHour > END || (endHour === END && minute > 0)) {
        continue;
      }

      // Verificar conflitos
      const hasConflict = checkTimeConflict(time, endTime, dayAppointments);

      slots.push({
        time,
        available: !hasConflict,
      });
    }
  }

  return slots;
};

/**
 * Gera slots de horário para um dia (com configurações personalizadas)
 */
export const generateTimeSlotsWithSettings = (
  date: string,
  appointments: Appointment[],
  serviceDuration: number,
  settings: AppSettings | null
): TimeSlot[] => {
  const slots: TimeSlot[] = [];

  const SLOT_INTERVAL = settings?.timeSlotInterval ?? BUSINESS_HOURS.SLOT_INTERVAL;

  // Verificar se é feriado
  if (settings?.holidays.includes(date)) {
    return []; // Retorna array vazio se for feriado
  }

  // Horário do dia da semana (autoridade), com fallback para o horário global
  let START = settings?.businessHours.start ?? BUSINESS_HOURS.START;
  let END = settings?.businessHours.end ?? BUSINESS_HOURS.END;
  const weekday = dayjs(date).day();
  const dayCfg = settings?.weeklyHours?.[weekday];
  if (dayCfg) {
    if (!dayCfg.open) return []; // dia fechado (folga fixa)
    START = dayCfg.start;
    END = dayCfg.end;
  }

  // Filtrar agendamentos do dia
  const dayAppointments = appointments.filter(a => a.date === date);

  // Gerar slots com intervalo configurado
  for (let hour = START; hour < END; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_INTERVAL) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const endTime = calculateEndTime(time, serviceDuration);

      // Verificar se o slot termina dentro do horário de funcionamento
      const [endHour, endMinute] = endTime.split(':').map(Number);
      if (endHour > END || (endHour === END && endMinute > 0)) {
        continue;
      }

      // Verificar conflitos
      const hasConflict = checkTimeConflict(time, endTime, dayAppointments);

      slots.push({
        time,
        available: !hasConflict,
      });
    }
  }

  return slots;
};

/**
 * Monta um horário semanal padrão (todos os dias com o mesmo horário; dias
 * em `closedDays` ficam fechados).
 */
export const buildWeeklyHours = (
  start: number,
  end: number,
  closedDays: number[] = []
): WeeklyHours => {
  const weekly: WeeklyHours = {};
  for (let d = 0; d <= 6; d++) {
    weekly[d] = { open: !closedDays.includes(d), start, end };
  }
  return weekly;
};

/**
 * Verifica se um dia da semana está marcado como fechado (folga fixa).
 */
export const isDayClosed = (settings: AppSettings | null, date: string): boolean => {
  const cfg = settings?.weeklyHours?.[dayjs(date).day()];
  return cfg ? !cfg.open : false;
};

/**
 * Verifica se há conflito de horário
 */
export const checkTimeConflict = (
  startTime: string,
  endTime: string,
  appointments: Appointment[]
): boolean => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const newStart = startHour * 60 + startMin;
  const newEnd = endHour * 60 + endMin;

  return appointments.some(appointment => {
    const [aStartHour, aStartMin] = appointment.startTime.split(':').map(Number);
    const [aEndHour, aEndMin] = appointment.endTime.split(':').map(Number);
    const aStart = aStartHour * 60 + aStartMin;
    const aEnd = aEndHour * 60 + aEndMin;

    // Verifica sobreposição
    return (newStart < aEnd && newEnd > aStart);
  });
};

/**
 * Verifica se uma data é hoje ou no futuro
 */
export const isDateValid = (date: string): boolean => {
  return dayjs(date).isAfter(dayjs().subtract(1, 'day'), 'day');
};

/**
 * Retorna a data de hoje no formato ISO
 */
export const getTodayISO = (): string => {
  return dayjs().format('YYYY-MM-DD');
};

/**
 * Retorna timestamp atual ISO
 */
export const getCurrentTimestamp = (): string => {
  return dayjs().toISOString();
};

/**
 * Número de dias entre repetições, por tipo de recorrência.
 */
export const RECURRENCE_DAYS: Record<RecurrenceInterval, number> = {
  weekly: 7,
  biweekly: 14,
  '3weeks': 21,
  monthly: 28,
};

/**
 * Gera as datas subsequentes de uma recorrência (não inclui a data inicial).
 * Ex.: getRecurrenceDates('2026-07-27', 14, 3) → quinzenas seguintes.
 */
export const getRecurrenceDates = (
  startDate: string,
  intervalDays: number,
  count: number
): string[] => {
  return Array.from({ length: count }, (_, i) =>
    dayjs(startDate).add((i + 1) * intervalDays, 'day').format('YYYY-MM-DD')
  );
};

/**
 * Diferença em minutos entre dois horários 'HH:mm' (fim - início).
 */
export const minutesBetween = (startTime: string, endTime: string): number => {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
};
