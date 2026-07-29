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
  priceCents?: number; // preço em centavos (evita erro de arredondamento)
  createdAt: string;
  updatedAt: string;
}

/**
 * Dados para criar um novo serviço
 */
export interface CreateServiceDTO {
  name: string;
  durationMinutes: number;
  priceCents?: number;
}

/**
 * Dados para atualizar um serviço
 */
export interface UpdateServiceDTO {
  name?: string;
  durationMinutes?: number;
  priceCents?: number;
}

/**
 * Profissional do salão (manicure/pedicure)
 */
export interface Professional {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfessionalDTO {
  name: string;
  active?: boolean;
}

export interface UpdateProfessionalDTO {
  name?: string;
  active?: boolean;
}

/**
 * Cliente cadastrada no salão
 */
export interface Client {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  tier: 'regular' | 'premium';
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientDTO {
  name: string;
  phone?: string;
  notes?: string;
  tier: 'regular' | 'premium';
}

export interface UpdateClientDTO {
  name?: string;
  phone?: string;
  notes?: string;
  tier?: 'regular' | 'premium';
}

/**
 * Intervalo de recorrência de agendamentos
 */
export type RecurrenceInterval = 'weekly' | 'biweekly' | '3weeks' | 'monthly';

export interface RecurrenceOptions {
  interval: RecurrenceInterval;
  count: number;
}

/**
 * Slot individual dentro de um pacote de serviços
 */
export interface PackageSlot {
  id: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  date?: string;
  startTime?: string;
  endTime?: string;
  appointmentId?: string;
  status: 'pending' | 'scheduled' | 'cancelled';
}

/**
 * Pacote de serviços contratado por uma cliente
 */
export interface ServicePackage {
  id: string;
  clientId?: string;
  clientName: string;
  slots: PackageSlot[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePackageDTO {
  clientId?: string;
  clientName: string;
  slots: Array<{
    serviceId: string;
    serviceName: string;
    durationMinutes: number;
  }>;
}

/**
 * Agendamento de um serviço
 */
export interface Appointment {
  id: string;
  clientName: string;
  clientId?: string; // vínculo com cliente cadastrada
  serviceId: string;
  serviceName: string;
  professionalId?: string; // profissional responsável (opcional)
  professionalName?: string; // snapshot do nome do profissional
  date: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  calendarEventId?: string; // ID do evento no Google Calendar
  attendanceStatus?: 'confirmed' | 'missed'; // Status de presença da cliente
  priceCents?: number; // snapshot do preço no momento do agendamento
  paymentStatus?: 'paid' | 'pending'; // status de pagamento
  recurrenceGroupId?: string; // agrupa agendamentos recorrentes
  packageId?: string; // vínculo com pacote de serviços
  createdAt: string;
  updatedAt: string;
}

/**
 * Dados para criar um novo agendamento
 */
export interface CreateAppointmentDTO {
  clientName: string;
  clientId?: string;
  serviceId: string;
  professionalId?: string;
  date: string;
  startTime: string;
  recurrenceGroupId?: string;
  packageId?: string;
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
 * Antecedência do lembrete de agendamento (em minutos ou dia anterior)
 */
export type ReminderOffset = 5 | 30 | 60 | 120 | 'day_before';

/**
 * Configurações de lembretes
 */
export interface ReminderSettings {
  appointmentRemindersEnabled: boolean; // Lembrete individual por agendamento
  reminderOffset: ReminderOffset; // Antecedência do lembrete
  dailyMorningReminderEnabled: boolean; // Lembrete matinal (1h antes do início do expediente)
  dailyEveningReminderEnabled: boolean; // Lembrete noturno (1h após o término do expediente)
}

/**
 * Horário de funcionamento de um dia da semana.
 */
export interface DayHours {
  open: boolean;
  start: number; // 0-23
  end: number; // 0-23
}

/**
 * Horários por dia da semana (0 = Domingo ... 6 = Sábado).
 */
export type WeeklyHours = Record<number, DayHours>;

/**
 * Configurações do sistema
 */
export interface AppSettings {
  businessHours: {
    start: number; // Hora de início (0-23) — global/legado, usado nos lembretes diários
    end: number; // Hora de fim (0-23)
  };
  weeklyHours?: WeeklyHours; // Horário por dia da semana (autoridade para os slots)
  timeSlotInterval: TimeSlotInterval; // Intervalo dos slots em minutos
  theme: ThemeMode;
  holidays: string[]; // Array de datas no formato YYYY-MM-DD
  reminderSettings: ReminderSettings;
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
  weeklyHours?: WeeklyHours;
  timeSlotInterval?: TimeSlotInterval;
  theme?: ThemeMode;
  holidays?: string[];
  reminderSettings?: Partial<ReminderSettings>;
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
  Clients: undefined;
  CreateClient: { clientId?: string };
  Packages: undefined;
  CreatePackage: undefined;
  PackageDetail: { packageId: string };
  SchedulePackageSlot: { packageId: string; slotId: string };
  Security: undefined;
  PrivacyPolicy: undefined;
  Reschedule: { appointmentId: string };
  Account: undefined;
  Dashboard: undefined;
  Professionals: undefined;
  BusinessHours: undefined;
  Paywall: undefined;
};
