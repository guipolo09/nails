// ============================================
// SERVIÇO DE SINCRONIZAÇÃO (offline-first)
// Orquestra push (outbox → nuvem) e pull (nuvem → banco local), com resolução
// de conflito Last-Write-Wins. A fonte de verdade da UI continua sendo o SQLite
// local; a nuvem é uma camada de backup/sync por cima.
// ============================================

import { db } from '../database/database';
import { getRemoteAdapter, getAuthAdapter } from './adapters';
import {
  getPendingChanges,
  clearPushed,
  getCursor,
  setCursor,
  isSyncEnabled,
  setSyncEnabled,
} from './outbox';
import { remoteWins, compareByApplyOrder } from './mergeLWW';
import type { SyncEntity, RemoteRecord, SyncResult } from './types';

/** Colunas locais por entidade — filtra payloads remotos para evitar colunas inválidas. */
const ENTITY_COLUMNS: Record<SyncEntity, string[]> = {
  clients: ['id', 'name', 'phone', 'notes', 'tier', 'createdAt', 'updatedAt'],
  services: ['id', 'name', 'durationMinutes', 'priceCents', 'createdAt', 'updatedAt'],
  professionals: ['id', 'name', 'active', 'createdAt', 'updatedAt'],
  appointments: [
    'id', 'clientId', 'clientName', 'serviceId', 'serviceName', 'professionalId',
    'professionalName', 'date', 'startTime', 'endTime', 'attendanceStatus', 'priceCents',
    'paymentStatus', 'recurrenceGroupId', 'packageId', 'createdAt', 'updatedAt',
  ],
  packages: ['id', 'clientId', 'clientName', 'createdAt', 'updatedAt'],
  package_slots: [
    'id', 'packageId', 'serviceId', 'serviceName', 'durationMinutes', 'date',
    'startTime', 'endTime', 'appointmentId', 'status', 'orderIndex',
  ],
};

// Entidades sem coluna updatedAt: nesses casos o remoto sempre vence.
const NO_UPDATED_AT = new Set<SyncEntity>(['package_slots']);

function localUpdatedAt(entity: SyncEntity, id: string): string | null {
  if (NO_UPDATED_AT.has(entity)) return null;
  const row = db.getFirstSync<{ updatedAt: string }>(
    `SELECT updatedAt FROM ${entity} WHERE id = ?`,
    [id]
  );
  return row?.updatedAt ?? null;
}

function upsertLocal(entity: SyncEntity, payload: Record<string, unknown>): void {
  const allowed = ENTITY_COLUMNS[entity];
  const cols = Object.keys(payload).filter(c => allowed.includes(c));
  if (!cols.includes('id')) return;

  const placeholders = cols.map(() => '?').join(', ');
  const updates = cols
    .filter(c => c !== 'id')
    .map(c => `${c} = excluded.${c}`)
    .join(', ');
  const values = cols.map(c => payload[c] as string | number | null);

  db.runSync(
    `INSERT INTO ${entity} (${cols.join(', ')}) VALUES (${placeholders})
     ON CONFLICT(id) DO UPDATE SET ${updates}`,
    values
  );
}

function deleteLocal(entity: SyncEntity, id: string): void {
  db.runSync(`DELETE FROM ${entity} WHERE id = ?`, [id]);
}

/**
 * Aplica mudanças remotas no banco local (LWW). As escritas aqui NÃO passam pelo
 * outbox (evita eco de sincronização). Ordena por dependência de FK.
 */
export function applyRemoteChanges(changes: RemoteRecord[]): number {
  const ordered = [...changes].sort((a, b) => compareByApplyOrder(a.entity, b.entity));
  let applied = 0;

  db.withTransactionSync(() => {
    for (const change of ordered) {
      const localTs = localUpdatedAt(change.entity, change.entityId);
      if (!remoteWins(localTs, change.updatedAt)) continue;

      if (change.deleted) {
        deleteLocal(change.entity, change.entityId);
      } else if (change.payload) {
        upsertLocal(change.entity, change.payload);
      }
      applied++;
    }
  });

  return applied;
}

/**
 * Executa um ciclo de sincronização (push + pull). Seguro chamar sempre:
 * retorna { skipped } quando não há provedor/sessão/ativação.
 */
export async function runSync(): Promise<SyncResult> {
  const remote = getRemoteAdapter();
  const auth = getAuthAdapter();

  if (!remote.isConfigured() || !auth.isConfigured()) {
    return { skipped: true, reason: 'not_configured' };
  }
  if (!isSyncEnabled()) {
    return { skipped: true, reason: 'disabled' };
  }
  const session = await auth.getSession();
  if (!session) {
    return { skipped: true, reason: 'no_session' };
  }

  // 1) PUSH — envia mudanças locais pendentes
  const pending = getPendingChanges();
  let pushed = 0;
  if (pending.length > 0) {
    await remote.push(pending);
    clearPushed(pending.map(c => c.id));
    pushed = pending.length;
  }

  // 2) PULL — baixa e aplica mudanças remotas desde o último cursor
  const { changes, cursor } = await remote.pull(getCursor());
  const pulled = applyRemoteChanges(changes);
  if (cursor) setCursor(cursor);

  return { skipped: false, pushed, pulled };
}

/**
 * Ativa a sincronização e enfileira TODOS os registros locais existentes para o
 * primeiro envio (seed inicial da nuvem). Chamar ao conectar/entrar na conta.
 */
export function enableSyncAndSeed(): void {
  setSyncEnabled(true);

  const entities: SyncEntity[] = ['clients', 'services', 'professionals', 'packages', 'appointments', 'package_slots'];
  db.withTransactionSync(() => {
    for (const entity of entities) {
      const allowed = ENTITY_COLUMNS[entity];
      const rows = db.getAllSync<Record<string, unknown>>(`SELECT * FROM ${entity}`);
      const now = new Date().toISOString();
      for (const row of rows) {
        // Filtra colunas sincronizáveis (exclui, p.ex., calendarEventId device-local)
        const payload: Record<string, unknown> = {};
        for (const col of allowed) {
          if (col in row) payload[col] = row[col];
        }
        db.runSync(
          `INSERT INTO sync_outbox (entity, entityId, op, payload, updatedAt)
           VALUES (?, ?, 'upsert', ?, ?)`,
          [entity, String(row.id), JSON.stringify(payload), now]
        );
      }
    }
  });
}

export function disableSync(): void {
  setSyncEnabled(false);
}
