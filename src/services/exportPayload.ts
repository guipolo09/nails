// ============================================
// MONTAGEM DO PAYLOAD DE EXPORTAÇÃO (LGPD) — módulo puro
// Sem dependências nativas, para permitir testes unitários isolados.
// ============================================

import type { Client, Service, Appointment, ServicePackage, AppSettings } from '../types';

export interface ExportPayload {
  exportedAt: string;
  appVersion: string;
  clients: Client[];
  services: Service[];
  appointments: Appointment[];
  packages: ServicePackage[];
  settings: AppSettings;
}

/**
 * Monta o objeto de exportação (função pura — facilita testes).
 */
export function buildExportPayload(params: {
  exportedAt: string;
  appVersion: string;
  clients: Client[];
  services: Service[];
  appointments: Appointment[];
  packages: ServicePackage[];
  settings: AppSettings;
}): ExportPayload {
  return {
    exportedAt: params.exportedAt,
    appVersion: params.appVersion,
    clients: params.clients,
    services: params.services,
    appointments: params.appointments,
    packages: params.packages,
    settings: params.settings,
  };
}
