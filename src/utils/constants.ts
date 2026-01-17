// ============================================
// CONSTANTES DO APLICATIVO
// ============================================

/**
 * Chaves de armazenamento local
 */
export const STORAGE_KEYS = {
  SERVICES: '@nails/services',
  APPOINTMENTS: '@nails/appointments',
} as const;

/**
 * Configurações de horário de funcionamento
 */
export const BUSINESS_HOURS = {
  START: 8, // 8:00
  END: 18, // 18:00
  SLOT_INTERVAL: 30, // Intervalo em minutos entre slots
} as const;

/**
 * Mensagens de feedback para o usuário
 */
export const MESSAGES = {
  // Serviços
  SERVICE_CREATED: 'Serviço cadastrado com sucesso!',
  SERVICE_UPDATED: 'Serviço atualizado com sucesso!',
  SERVICE_DELETED: 'Serviço excluído com sucesso!',
  SERVICE_ERROR: 'Erro ao processar serviço. Tente novamente.',
  SERVICE_NAME_REQUIRED: 'Digite o nome do serviço',
  SERVICE_DURATION_REQUIRED: 'Informe a duração do serviço',

  // Agendamentos
  APPOINTMENT_CREATED: 'Agendamento realizado com sucesso!',
  APPOINTMENT_DELETED: 'Agendamento cancelado com sucesso!',
  APPOINTMENT_ERROR: 'Erro ao processar agendamento. Tente novamente.',
  APPOINTMENT_CONFLICT: 'Este horário já está ocupado. Escolha outro horário.',
  SELECT_SERVICE: 'Selecione um serviço',
  SELECT_DATE: 'Selecione uma data',
  SELECT_TIME: 'Selecione um horário',

  // Calendário
  CALENDAR_PERMISSION_DENIED: 'Permissão do calendário negada. O evento não será salvo na agenda.',
  CALENDAR_EVENT_CREATED: 'Evento adicionado ao Google Agenda!',
  CALENDAR_ERROR: 'Erro ao criar evento no calendário.',

  // Geral
  CONFIRM_DELETE: 'Tem certeza que deseja excluir?',
  NO_DATA: 'Nenhum item encontrado',
  LOADING: 'Carregando...',
} as const;

/**
 * Cores do tema
 */
export const COLORS = {
  primary: '#E91E63', // Rosa vibrante
  primaryLight: '#FCE4EC',
  secondary: '#9C27B0',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  error: '#F44336',
  success: '#4CAF50',
  warning: '#FF9800',
  border: '#E0E0E0',
} as const;
