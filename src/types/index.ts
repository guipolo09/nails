// ============================================
// TIPOS E INTERFACES DO APLICATIVO
// Preparado para futura integração com backend
// ============================================

/**
 * Serviço oferecido pelo salão
 */
export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dados para criar um novo serviço
 */
export interface CreateServiceDTO {
  name: string;
  durationMinutes: number;
}

/**
 * Dados para atualizar um serviço
 */
export interface UpdateServiceDTO {
  name?: string;
  durationMinutes?: number;
}

/**
 * Agendamento de um serviço
 */
export interface Appointment {
  id: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  date: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  calendarEventId?: string; // ID do evento no Google Calendar
  createdAt: string;
  updatedAt: string;
}

/**
 * Dados para criar um novo agendamento
 */
export interface CreateAppointmentDTO {
  clientName: string;
  serviceId: string;
  date: string;
  startTime: string;
}

/**
 * Slot de horário disponível
 */
export interface TimeSlot {
  time: string; // HH:mm
  available: boolean;
}

/**
 * Interface base para repositórios
 * Preparado para futura integração com API REST
 */
export interface Repository<T, CreateDTO, UpdateDTO> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(data: CreateDTO): Promise<T>;
  update(id: string, data: UpdateDTO): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

/**
 * Resultado de operação com feedback
 */
export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  message: string;
}

/**
 * Intervalo de tempo para slots de agendamento
 */
export type TimeSlotInterval = 15 | 30 | 45 | 60;

/**
 * Tema do aplicativo
 */
export type ThemeMode = 'light' | 'dark';

/**
 * Configurações do sistema
 */
export interface AppSettings {
  businessHours: {
    start: number; // Hora de início (0-23)
    end: number; // Hora de fim (0-23)
  };
  timeSlotInterval: TimeSlotInterval; // Intervalo dos slots em minutos
  theme: ThemeMode;
  holidays: string[]; // Array de datas no formato YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

/**
 * Dados para atualizar configurações
 */
export interface UpdateSettingsDTO {
  businessHours?: {
    start: number;
    end: number;
  };
  timeSlotInterval?: TimeSlotInterval;
  theme?: ThemeMode;
  holidays?: string[];
}

/**
 * Tipo para navegação do app
 */
export type RootStackParamList = {
  Home: undefined;
  Services: undefined;
  CreateService: { serviceId?: string };
  Schedule: undefined;
  CreateSchedule: undefined;
  Settings: undefined;
};
