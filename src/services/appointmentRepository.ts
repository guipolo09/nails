// ============================================
// REPOSITÓRIO DE AGENDAMENTOS
// Implementação local - preparado para futura API
// ============================================

import { saveData, loadData } from '../storage/asyncStorage';
import { STORAGE_KEYS } from '../utils/constants';
import { generateId, getCurrentTimestamp, calculateEndTime, checkTimeConflict } from '../utils/helpers';
import { serviceRepository } from './serviceRepository';
import type { Appointment, CreateAppointmentDTO, Repository } from '../types';

/**
 * DTO para atualização de agendamento
 */
export interface UpdateAppointmentDTO {
  calendarEventId?: string;
}

/**
 * Interface do repositório de agendamentos
 */
export interface IAppointmentRepository extends Repository<Appointment, CreateAppointmentDTO, UpdateAppointmentDTO> {
  getByDate(date: string): Promise<Appointment[]>;
  hasConflict(date: string, startTime: string, endTime: string, excludeId?: string): Promise<boolean>;
}

/**
 * Implementação local do repositório usando AsyncStorage
 */
class LocalAppointmentRepository implements IAppointmentRepository {
  private async getAllAppointments(): Promise<Appointment[]> {
    const data = await loadData<Appointment[]>(STORAGE_KEYS.APPOINTMENTS);
    return data || [];
  }

  private async saveAllAppointments(appointments: Appointment[]): Promise<void> {
    await saveData(STORAGE_KEYS.APPOINTMENTS, appointments);
  }

  async getAll(): Promise<Appointment[]> {
    const appointments = await this.getAllAppointments();
    // Ordenar por data e horário
    return appointments.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
  }

  async getById(id: string): Promise<Appointment | null> {
    const appointments = await this.getAllAppointments();
    return appointments.find(a => a.id === id) || null;
  }

  async getByDate(date: string): Promise<Appointment[]> {
    const appointments = await this.getAllAppointments();
    return appointments
      .filter(a => a.date === date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  async hasConflict(
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): Promise<boolean> {
    const appointments = await this.getByDate(date);
    const filtered = excludeId
      ? appointments.filter(a => a.id !== excludeId)
      : appointments;

    return checkTimeConflict(startTime, endTime, filtered);
  }

  async create(data: CreateAppointmentDTO): Promise<Appointment> {
    const appointments = await this.getAllAppointments();

    // Buscar informações do serviço
    const service = await serviceRepository.getById(data.serviceId);
    if (!service) {
      throw new Error('Serviço não encontrado');
    }

    const endTime = calculateEndTime(data.startTime, service.durationMinutes);

    // Verificar conflito
    const hasConflict = await this.hasConflict(data.date, data.startTime, endTime);
    if (hasConflict) {
      throw new Error('Conflito de horário');
    }

    const timestamp = getCurrentTimestamp();

    const newAppointment: Appointment = {
      id: generateId(),
      clientName: data.clientName.trim(),
      serviceId: data.serviceId,
      serviceName: service.name,
      date: data.date,
      startTime: data.startTime,
      endTime,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    appointments.push(newAppointment);
    await this.saveAllAppointments(appointments);

    return newAppointment;
  }

  async update(id: string, data: UpdateAppointmentDTO): Promise<Appointment | null> {
    const appointments = await this.getAllAppointments();
    const index = appointments.findIndex(a => a.id === id);

    if (index === -1) {
      return null;
    }

    const updatedAppointment: Appointment = {
      ...appointments[index],
      ...data,
      updatedAt: getCurrentTimestamp(),
    };

    appointments[index] = updatedAppointment;
    await this.saveAllAppointments(appointments);

    return updatedAppointment;
  }

  async delete(id: string): Promise<boolean> {
    const appointments = await this.getAllAppointments();
    const filteredAppointments = appointments.filter(a => a.id !== id);

    if (filteredAppointments.length === appointments.length) {
      return false;
    }

    await this.saveAllAppointments(filteredAppointments);
    return true;
  }
}

// Singleton para uso em todo o app
export const appointmentRepository: IAppointmentRepository = new LocalAppointmentRepository();
