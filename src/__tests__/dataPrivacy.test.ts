// ============================================
// TESTES — construção do payload de exportação (LGPD)
// Função pura, sem dependências nativas.
// ============================================

import { buildExportPayload } from '../services/exportPayload';
import type { Client, Service, Appointment, ServicePackage, AppSettings } from '../types';

const settings: AppSettings = {
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
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const clients: Client[] = [
  { id: 'c1', name: 'Maria', phone: '11999', tier: 'regular', createdAt: '', updatedAt: '' },
];
const services: Service[] = [
  { id: 's1', name: 'Manicure', durationMinutes: 45, createdAt: '', updatedAt: '' },
];
const appointments: Appointment[] = [
  {
    id: 'a1', clientName: 'Maria', clientId: 'c1', serviceId: 's1', serviceName: 'Manicure',
    date: '2026-07-27', startTime: '10:00', endTime: '10:45', createdAt: '', updatedAt: '',
  },
];
const packages: ServicePackage[] = [];

describe('buildExportPayload', () => {
  it('inclui todos os conjuntos de dados e metadados', () => {
    const payload = buildExportPayload({
      exportedAt: '2026-07-27T12:00:00.000Z',
      appVersion: '1.0.0',
      clients,
      services,
      appointments,
      packages,
      settings,
    });

    expect(payload.exportedAt).toBe('2026-07-27T12:00:00.000Z');
    expect(payload.appVersion).toBe('1.0.0');
    expect(payload.clients).toHaveLength(1);
    expect(payload.services).toHaveLength(1);
    expect(payload.appointments).toHaveLength(1);
    expect(payload.packages).toHaveLength(0);
    expect(payload.settings.businessHours.start).toBe(8);
  });

  it('gera JSON serializável', () => {
    const payload = buildExportPayload({
      exportedAt: '2026-07-27T12:00:00.000Z',
      appVersion: '1.0.0',
      clients,
      services,
      appointments,
      packages,
      settings,
    });
    const json = JSON.stringify(payload);
    const parsed = JSON.parse(json);
    expect(parsed.clients[0].name).toBe('Maria');
    expect(parsed.appointments[0].startTime).toBe('10:00');
  });
});
