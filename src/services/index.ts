// ============================================
// EXPORTAÇÃO DOS SERVIÇOS
// ============================================

export { serviceRepository } from './serviceRepository';
export type { IServiceRepository } from './serviceRepository';

export { appointmentRepository } from './appointmentRepository';
export type { IAppointmentRepository, UpdateAppointmentDTO } from './appointmentRepository';

export {
  requestCalendarPermission,
  hasCalendarPermission,
  createCalendarEvent,
  deleteCalendarEvent,
} from './calendarService';
