// ============================================
// EXPORTAÇÃO DOS SERVIÇOS
// ============================================

export { clientRepository } from './clientRepository';

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

export {
  setupNotificationHandler,
  setupNotificationChannel,
  requestNotificationPermissions,
  hasNotificationPermissions,
  scheduleAppointmentReminder,
  cancelAppointmentReminder,
  scheduleDailyMorningReminder,
  cancelDailyMorningReminder,
  scheduleDailyEveningReminder,
  cancelDailyEveningReminder,
  getReminderOffsetLabel,
} from './notificationService';
