// ============================================
// REPOSITÓRIO DE AGENDAMENTOS (SQLite)
// Checagem de conflito + inserção de forma ATÔMICA (transação),
// eliminando a condição de corrida do modelo anterior (AsyncStorage).
// ============================================

import { db } from '../database/database';
import { generateId, getCurrentTimestamp, calculateEndTime } from '../utils/helpers';
import { recordChange } from '../sync/outbox';
import { serviceRepository } from './serviceRepository';
import { professionalRepository } from './professionalRepository';
import type { Appointment, CreateAppointmentDTO, Repository } from '../types';

// calendarEventId é DEVICE-LOCAL (id do evento na agenda deste aparelho) e por
// isso é omitido do payload de sincronização.
function appointmentToRow(a: Appointment): Record<string, unknown> {
  return {
    id: a.id,
    clientId: a.clientId ?? null,
    clientName: a.clientName,
    serviceId: a.serviceId ?? null,
    serviceName: a.serviceName,
    professionalId: a.professionalId ?? null,
    professionalName: a.professionalName ?? null,
    date: a.date,
    startTime: a.startTime,
    endTime: a.endTime,
    attendanceStatus: a.attendanceStatus ?? null,
    priceCents: a.priceCents ?? null,
    paymentStatus: a.paymentStatus ?? null,
    recurrenceGroupId: a.recurrenceGroupId ?? null,
    packageId: a.packageId ?? null,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

/**
 * DTO para atualização de agendamento
 */
export interface UpdateAppointmentDTO {
  calendarEventId?: string;
  attendanceStatus?: 'confirmed' | 'missed';
  paymentStatus?: 'paid' | 'pending';
}

/**
 * DTO para remarcação (mudança de data/horário e, opcionalmente, serviço)
 */
export interface RescheduleAppointmentDTO {
  date: string;
  startTime: string;
  serviceId?: string;
}

/**
 * Interface do repositório de agendamentos
 */
export interface IAppointmentRepository extends Repository<Appointment, CreateAppointmentDTO, UpdateAppointmentDTO> {
  getByDate(date: string): Promise<Appointment[]>;
  getByRecurrenceGroup(groupId: string): Promise<Appointment[]>;
  hasConflict(date: string, startTime: string, endTime: string, excludeId?: string): Promise<boolean>;
  reschedule(id: string, data: RescheduleAppointmentDTO): Promise<Appointment>;
}

interface AppointmentRow {
  id: string;
  clientId: string | null;
  clientName: string;
  serviceId: string | null;
  serviceName: string;
  professionalId: string | null;
  professionalName: string | null;
  date: string;
  startTime: string;
  endTime: string;
  calendarEventId: string | null;
  attendanceStatus: string | null;
  priceCents: number | null;
  paymentStatus: string | null;
  recurrenceGroupId: string | null;
  packageId: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    clientId: row.clientId ?? undefined,
    clientName: row.clientName,
    serviceId: row.serviceId ?? '',
    serviceName: row.serviceName,
    professionalId: row.professionalId ?? undefined,
    professionalName: row.professionalName ?? undefined,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    calendarEventId: row.calendarEventId ?? undefined,
    attendanceStatus: (row.attendanceStatus as Appointment['attendanceStatus']) ?? undefined,
    priceCents: row.priceCents ?? undefined,
    paymentStatus: (row.paymentStatus as Appointment['paymentStatus']) ?? undefined,
    recurrenceGroupId: row.recurrenceGroupId ?? undefined,
    packageId: row.packageId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Detecta sobreposição de horário via SQL — POR PROFISSIONAL.
 * Como os horários são strings 'HH:mm' com zero à esquerda, a comparação
 * lexicográfica equivale à comparação numérica.
 * Sobreposição: existente.start < novo.end  E  existente.end > novo.start.
 * Só há conflito quando é o MESMO profissional (agendamentos sem profissional
 * compartilham o "recurso único" padrão). IFNULL agrupa os nulos.
 */
function conflictExists(
  date: string,
  startTime: string,
  endTime: string,
  professionalId?: string,
  excludeId?: string
): boolean {
  const prof = professionalId ?? null;
  const row = excludeId
    ? db.getFirstSync(
        `SELECT 1 FROM appointments
         WHERE date = ? AND startTime < ? AND endTime > ?
           AND IFNULL(professionalId, '__none__') = IFNULL(?, '__none__')
           AND id <> ? LIMIT 1`,
        [date, endTime, startTime, prof, excludeId]
      )
    : db.getFirstSync(
        `SELECT 1 FROM appointments
         WHERE date = ? AND startTime < ? AND endTime > ?
           AND IFNULL(professionalId, '__none__') = IFNULL(?, '__none__') LIMIT 1`,
        [date, endTime, startTime, prof]
      );
  return row != null;
}

/**
 * Implementação local do repositório usando SQLite
 */
class LocalAppointmentRepository implements IAppointmentRepository {
  async getAll(): Promise<Appointment[]> {
    const rows = db.getAllSync<AppointmentRow>(
      'SELECT * FROM appointments ORDER BY date ASC, startTime ASC'
    );
    return rows.map(rowToAppointment);
  }

  async getById(id: string): Promise<Appointment | null> {
    const row = db.getFirstSync<AppointmentRow>('SELECT * FROM appointments WHERE id = ?', [id]);
    return row ? rowToAppointment(row) : null;
  }

  async getByDate(date: string): Promise<Appointment[]> {
    const rows = db.getAllSync<AppointmentRow>(
      'SELECT * FROM appointments WHERE date = ? ORDER BY startTime ASC',
      [date]
    );
    return rows.map(rowToAppointment);
  }

  async getByRecurrenceGroup(groupId: string): Promise<Appointment[]> {
    const rows = db.getAllSync<AppointmentRow>(
      'SELECT * FROM appointments WHERE recurrenceGroupId = ? ORDER BY date ASC, startTime ASC',
      [groupId]
    );
    return rows.map(rowToAppointment);
  }

  async hasConflict(
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): Promise<boolean> {
    return conflictExists(date, startTime, endTime, undefined, excludeId);
  }

  async create(data: CreateAppointmentDTO): Promise<Appointment> {
    // Buscar informações do serviço (fora da transação: leitura simples)
    const service = await serviceRepository.getById(data.serviceId);
    if (!service) {
      throw new Error('Serviço não encontrado');
    }

    const endTime = calculateEndTime(data.startTime, service.durationMinutes);
    const timestamp = getCurrentTimestamp();

    const professional = data.professionalId
      ? professionalRepository.getById(data.professionalId)
      : null;

    const newAppointment: Appointment = {
      id: generateId(),
      clientName: data.clientName.trim(),
      clientId: data.clientId,
      serviceId: data.serviceId,
      serviceName: service.name,
      professionalId: professional?.id,
      professionalName: professional?.name,
      date: data.date,
      startTime: data.startTime,
      endTime,
      priceCents: service.priceCents, // snapshot do preço do serviço
      paymentStatus: service.priceCents != null ? 'pending' : undefined,
      recurrenceGroupId: data.recurrenceGroupId,
      packageId: data.packageId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Checagem de conflito + inserção atômicas: nenhuma outra escrita ocorre
    // entre a verificação e a gravação, eliminando dupla marcação por corrida.
    db.withTransactionSync(() => {
      if (conflictExists(data.date, data.startTime, endTime, newAppointment.professionalId)) {
        throw new Error('Conflito de horário');
      }
      db.runSync(
        `INSERT INTO appointments
          (id, clientId, clientName, serviceId, serviceName, professionalId, professionalName,
           date, startTime, endTime, calendarEventId, attendanceStatus, priceCents, paymentStatus,
           recurrenceGroupId, packageId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newAppointment.id,
          newAppointment.clientId ?? null,
          newAppointment.clientName,
          newAppointment.serviceId,
          newAppointment.serviceName,
          newAppointment.professionalId ?? null,
          newAppointment.professionalName ?? null,
          newAppointment.date,
          newAppointment.startTime,
          newAppointment.endTime,
          null,
          null,
          newAppointment.priceCents ?? null,
          newAppointment.paymentStatus ?? null,
          newAppointment.recurrenceGroupId ?? null,
          newAppointment.packageId ?? null,
          newAppointment.createdAt,
          newAppointment.updatedAt,
        ]
      );
    });

    recordChange('appointments', newAppointment.id, 'upsert', appointmentToRow(newAppointment));
    return newAppointment;
  }

  async reschedule(id: string, data: RescheduleAppointmentDTO): Promise<Appointment> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Agendamento não encontrado');
    }

    const serviceId = data.serviceId ?? existing.serviceId;
    const service = await serviceRepository.getById(serviceId);
    if (!service) {
      throw new Error('Serviço não encontrado');
    }

    const endTime = calculateEndTime(data.startTime, service.durationMinutes);
    const timestamp = getCurrentTimestamp();

    const updated: Appointment = {
      ...existing,
      serviceId,
      serviceName: service.name,
      date: data.date,
      startTime: data.startTime,
      endTime,
      priceCents: service.priceCents, // re-snapshot (o serviço pode ter mudado)
      calendarEventId: undefined, // o evento antigo passa a ser inválido; recriado pela camada acima
      updatedAt: timestamp,
    };

    db.withTransactionSync(() => {
      if (conflictExists(data.date, data.startTime, endTime, existing.professionalId, id)) {
        throw new Error('Conflito de horário');
      }
      db.runSync(
        `UPDATE appointments
         SET serviceId = ?, serviceName = ?, date = ?, startTime = ?, endTime = ?,
             priceCents = ?, calendarEventId = NULL, updatedAt = ?
         WHERE id = ?`,
        [serviceId, service.name, data.date, data.startTime, endTime, service.priceCents ?? null, timestamp, id]
      );
    });

    recordChange('appointments', id, 'upsert', appointmentToRow(updated));
    return updated;
  }

  async update(id: string, data: UpdateAppointmentDTO): Promise<Appointment | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated: Appointment = {
      ...existing,
      calendarEventId:
        data.calendarEventId !== undefined ? data.calendarEventId : existing.calendarEventId,
      attendanceStatus:
        data.attendanceStatus !== undefined ? data.attendanceStatus : existing.attendanceStatus,
      paymentStatus:
        data.paymentStatus !== undefined ? data.paymentStatus : existing.paymentStatus,
      updatedAt: getCurrentTimestamp(),
    };

    db.runSync(
      `UPDATE appointments SET calendarEventId = ?, attendanceStatus = ?, paymentStatus = ?, updatedAt = ? WHERE id = ?`,
      [
        updated.calendarEventId ?? null,
        updated.attendanceStatus ?? null,
        updated.paymentStatus ?? null,
        updated.updatedAt,
        id,
      ]
    );

    // Só sincroniza quando muda dado de negócio (presença/pagamento); calendarEventId é device-local.
    if (data.attendanceStatus !== undefined || data.paymentStatus !== undefined) {
      recordChange('appointments', id, 'upsert', appointmentToRow(updated));
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = db.runSync('DELETE FROM appointments WHERE id = ?', [id]);
    if (result.changes > 0) {
      recordChange('appointments', id, 'delete', null);
    }
    return result.changes > 0;
  }
}

// Singleton para uso em todo o app
export const appointmentRepository: IAppointmentRepository = new LocalAppointmentRepository();
