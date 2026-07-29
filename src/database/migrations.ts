// ============================================
// MIGRAÇÃO DE DADOS: AsyncStorage -> SQLite
// Executada uma única vez, movendo dados de usuários de versões
// anteriores (serviços, agendamentos, pacotes e configurações).
//
// Segurança:
//  - Idempotente: usa INSERT OR IGNORE (por chave primária) + flag de conclusão.
//  - Chaves estrangeiras são desativadas durante a cópia para tolerar
//    referências obsoletas nos dados antigos (ex.: agendamento apontando
//    para cliente já excluída).
//  - Os dados no AsyncStorage NÃO são apagados aqui (rede de segurança).
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './database';
import { STORAGE_KEYS } from '../utils/constants';
import type { Service, Appointment, ServicePackage, AppSettings } from '../types';

const MIGRATION_FLAG = 'migratedToSqliteV1';

async function loadJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw != null ? (JSON.parse(raw) as T) : null;
  } catch (error) {
    console.error(`Migração: erro ao ler ${key}:`, error);
    return null;
  }
}

function isMigrated(): boolean {
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [MIGRATION_FLAG]
  );
  return row?.value === 'true';
}

function markMigrated(): void {
  db.runSync(
    `INSERT INTO settings (key, value) VALUES (?, 'true')
     ON CONFLICT(key) DO UPDATE SET value = 'true'`,
    [MIGRATION_FLAG]
  );
}

/**
 * Executa a migração se ainda não tiver sido feita.
 * DEVE ser chamada na inicialização, ANTES de qualquer leitura dos repositórios.
 */
export async function runMigrations(): Promise<void> {
  try {
    if (isMigrated()) return;

    const [services, appointments, packages, settings] = await Promise.all([
      loadJSON<Service[]>(STORAGE_KEYS.SERVICES),
      loadJSON<Appointment[]>(STORAGE_KEYS.APPOINTMENTS),
      loadJSON<ServicePackage[]>(STORAGE_KEYS.PACKAGES),
      loadJSON<AppSettings>(STORAGE_KEYS.SETTINGS),
    ]);

    // FKs desativadas durante a cópia para tolerar referências obsoletas.
    db.execSync('PRAGMA foreign_keys = OFF;');
    try {
      db.withTransactionSync(() => {
        migrateServices(services);
        migratePackages(packages);
        migrateAppointments(appointments);
        migrateSettings(settings);
        markMigrated();
      });
    } finally {
      db.execSync('PRAGMA foreign_keys = ON;');
    }
  } catch (error) {
    // Não bloquear a inicialização do app por falha na migração.
    console.error('Falha na migração para SQLite:', error);
  }
}

function migrateServices(services: Service[] | null): void {
  if (!services?.length) return;
  for (const s of services) {
    db.runSync(
      `INSERT OR IGNORE INTO services (id, name, durationMinutes, priceCents, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [s.id, s.name, s.durationMinutes, null, s.createdAt, s.updatedAt]
    );
  }
}

function migrateAppointments(appointments: Appointment[] | null): void {
  if (!appointments?.length) return;
  for (const a of appointments) {
    db.runSync(
      `INSERT OR IGNORE INTO appointments
        (id, clientId, clientName, serviceId, serviceName, date, startTime, endTime,
         calendarEventId, attendanceStatus, recurrenceGroupId, packageId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        a.id,
        a.clientId ?? null,
        a.clientName,
        a.serviceId ?? null,
        a.serviceName,
        a.date,
        a.startTime,
        a.endTime,
        a.calendarEventId ?? null,
        a.attendanceStatus ?? null,
        a.recurrenceGroupId ?? null,
        a.packageId ?? null,
        a.createdAt,
        a.updatedAt,
      ]
    );
  }
}

function migratePackages(packages: ServicePackage[] | null): void {
  if (!packages?.length) return;
  for (const p of packages) {
    db.runSync(
      `INSERT OR IGNORE INTO packages (id, clientId, clientName, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?)`,
      [p.id, p.clientId ?? null, p.clientName, p.createdAt, p.updatedAt]
    );
    p.slots?.forEach((slot, index) => {
      db.runSync(
        `INSERT OR IGNORE INTO package_slots
          (id, packageId, serviceId, serviceName, durationMinutes, date, startTime, endTime,
           appointmentId, status, orderIndex)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          slot.id,
          p.id,
          slot.serviceId ?? null,
          slot.serviceName,
          slot.durationMinutes,
          slot.date ?? null,
          slot.startTime ?? null,
          slot.endTime ?? null,
          slot.appointmentId ?? null,
          slot.status,
          index,
        ]
      );
    });
  }
}

function migrateSettings(settings: AppSettings | null): void {
  if (!settings) return;
  // Só grava se ainda não houver configurações no SQLite (não sobrescreve).
  db.runSync(
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('app', ?)`,
    [JSON.stringify(settings)]
  );
}
