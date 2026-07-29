// ============================================
// TESTES — funções de negócio puras (helpers)
// Cobre a lógica de conflito de horário, cálculo de término,
// geração de slots (com feriados/horário) e validação de data.
// ============================================

import dayjs from 'dayjs';
import {
  checkTimeConflict,
  calculateEndTime,
  generateTimeSlotsWithSettings,
  isDateValid,
  getRecurrenceDates,
  minutesBetween,
  RECURRENCE_DAYS,
  buildWeeklyHours,
  isDayClosed,
} from '../utils/helpers';
import type { Appointment, AppSettings } from '../types';

function makeAppointment(startTime: string, endTime: string): Appointment {
  return {
    id: `${startTime}-${endTime}`,
    clientName: 'Teste',
    serviceId: 's1',
    serviceName: 'Serviço',
    date: '2026-07-23',
    startTime,
    endTime,
    createdAt: '',
    updatedAt: '',
  };
}

function makeSettings(partial: Partial<AppSettings> = {}): AppSettings {
  return {
    businessHours: { start: 8, end: 18 },
    timeSlotInterval: 30,
    theme: 'light',
    holidays: [],
    reminderSettings: {
      appointmentRemindersEnabled: false,
      reminderOffset: 30,
      dailyMorningReminderEnabled: false,
      dailyEveningReminderEnabled: false,
    },
    createdAt: '',
    updatedAt: '',
    ...partial,
  };
}

describe('calculateEndTime', () => {
  it('soma a duração corretamente', () => {
    expect(calculateEndTime('10:00', 45)).toBe('10:45');
    expect(calculateEndTime('10:30', 30)).toBe('11:00');
  });

  it('atravessa a hora corretamente', () => {
    expect(calculateEndTime('09:50', 30)).toBe('10:20');
    expect(calculateEndTime('08:15', 90)).toBe('09:45');
  });
});

describe('checkTimeConflict', () => {
  const existentes = [makeAppointment('10:00', '11:00')];

  it('detecta sobreposição parcial no início', () => {
    expect(checkTimeConflict('10:30', '11:30', existentes)).toBe(true);
  });

  it('detecta sobreposição parcial no fim', () => {
    expect(checkTimeConflict('09:30', '10:30', existentes)).toBe(true);
  });

  it('detecta agendamento contido dentro de outro', () => {
    expect(checkTimeConflict('10:15', '10:45', existentes)).toBe(true);
  });

  it('NÃO acusa conflito quando encosta no fim (10:00 termina, novo começa 11:00)', () => {
    expect(checkTimeConflict('11:00', '12:00', existentes)).toBe(false);
  });

  it('NÃO acusa conflito quando encosta no início (novo termina 10:00)', () => {
    expect(checkTimeConflict('09:00', '10:00', existentes)).toBe(false);
  });

  it('NÃO acusa conflito para horários totalmente separados', () => {
    expect(checkTimeConflict('14:00', '15:00', existentes)).toBe(false);
  });

  it('retorna false quando não há agendamentos', () => {
    expect(checkTimeConflict('10:00', '11:00', [])).toBe(false);
  });
});

describe('generateTimeSlotsWithSettings', () => {
  it('retorna vazio em feriado', () => {
    const settings = makeSettings({ holidays: ['2026-07-23'] });
    const slots = generateTimeSlotsWithSettings('2026-07-23', [], 30, settings);
    expect(slots).toHaveLength(0);
  });

  it('gera slots dentro do horário de funcionamento', () => {
    const settings = makeSettings({ businessHours: { start: 8, end: 10 }, timeSlotInterval: 30 });
    const slots = generateTimeSlotsWithSettings('2026-07-23', [], 30, settings);
    // 08:00, 08:30, 09:00, 09:30 (10:00 excluído: terminaria em 10:30 > fim)
    expect(slots.map(s => s.time)).toEqual(['08:00', '08:30', '09:00', '09:30']);
    expect(slots.every(s => s.available)).toBe(true);
  });

  it('não gera slot cujo término ultrapassa o expediente', () => {
    const settings = makeSettings({ businessHours: { start: 8, end: 10 } });
    const slots = generateTimeSlotsWithSettings('2026-07-23', [], 60, settings);
    // Serviço de 60min: último slot válido é 09:00 (termina 10:00)
    expect(slots.map(s => s.time)).toEqual(['08:00', '08:30', '09:00']);
  });

  it('marca como indisponível o slot em conflito', () => {
    const settings = makeSettings({ businessHours: { start: 8, end: 10 }, timeSlotInterval: 30 });
    const existentes = [makeAppointment('08:30', '09:00')];
    const slots = generateTimeSlotsWithSettings('2026-07-23', existentes, 30, settings);
    const s0830 = slots.find(s => s.time === '08:30');
    const s0900 = slots.find(s => s.time === '09:00');
    expect(s0830?.available).toBe(false);
    expect(s0900?.available).toBe(true);
  });

  it('usa horário padrão (8-18) quando settings é null', () => {
    const slots = generateTimeSlotsWithSettings('2026-07-23', [], 30, null);
    expect(slots[0].time).toBe('08:00');
    expect(slots.length).toBeGreaterThan(0);
  });
});

describe('generateTimeSlotsWithSettings + weeklyHours', () => {
  it('retorna vazio em dia fechado (folga fixa)', () => {
    const date = '2026-07-27';
    const weekday = dayjs(date).day();
    const weeklyHours = buildWeeklyHours(8, 18, [weekday]);
    const settings = makeSettings({ weeklyHours });
    expect(generateTimeSlotsWithSettings(date, [], 30, settings)).toHaveLength(0);
    expect(isDayClosed(settings, date)).toBe(true);
  });

  it('usa o horário do dia da semana quando aberto', () => {
    const date = '2026-07-27';
    const weekday = dayjs(date).day();
    const weeklyHours = buildWeeklyHours(8, 18);
    weeklyHours[weekday] = { open: true, start: 9, end: 11 };
    const settings = makeSettings({ weeklyHours });
    const slots = generateTimeSlotsWithSettings(date, [], 30, settings);
    expect(slots[0].time).toBe('09:00');
    expect(slots[slots.length - 1].time).toBe('10:30'); // 30min terminando <= 11:00
    expect(isDayClosed(settings, date)).toBe(false);
  });
});

describe('getRecurrenceDates', () => {
  it('gera datas quinzenais sem incluir a data inicial', () => {
    const dates = getRecurrenceDates('2026-07-27', RECURRENCE_DAYS.biweekly, 3);
    expect(dates).toEqual(['2026-08-10', '2026-08-24', '2026-09-07']);
  });

  it('gera datas semanais', () => {
    const dates = getRecurrenceDates('2026-07-27', RECURRENCE_DAYS.weekly, 2);
    expect(dates).toEqual(['2026-08-03', '2026-08-10']);
  });

  it('retorna vazio quando count é 0', () => {
    expect(getRecurrenceDates('2026-07-27', 7, 0)).toEqual([]);
  });
});

describe('minutesBetween', () => {
  it('calcula a duração entre dois horários', () => {
    expect(minutesBetween('10:00', '10:45')).toBe(45);
    expect(minutesBetween('09:30', '11:00')).toBe(90);
  });
});

describe('isDateValid', () => {
  it('aceita hoje', () => {
    expect(isDateValid(dayjs().format('YYYY-MM-DD'))).toBe(true);
  });

  it('aceita data futura', () => {
    expect(isDateValid(dayjs().add(3, 'day').format('YYYY-MM-DD'))).toBe(true);
  });

  it('rejeita data passada', () => {
    expect(isDateValid(dayjs().subtract(3, 'day').format('YYYY-MM-DD'))).toBe(false);
  });
});
