// ============================================
// OUTBOX — registro local de mudanças pendentes de sincronização
// As mudanças só são registradas quando a sincronização está ATIVADA (após
// conectar um provedor). Antes disso, `recordChange` é um no-op barato,
// evitando crescimento desnecessário da fila.
// ============================================

import { db } from '../database/database';
import type { ChangeRecord, SyncEntity, SyncOp } from './types';

const ENABLED_KEY = 'syncEnabled';
const CURSOR_KEY = 'pullCursor';

// Cache em memória do estado de ativação (evita ler o banco a cada mutação).
let syncEnabledCache: boolean | null = null;

function readEnabledFromDb(): boolean {
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM sync_state WHERE key = ?',
    [ENABLED_KEY]
  );
  return row?.value === 'true';
}

export function isSyncEnabled(): boolean {
  if (syncEnabledCache === null) {
    syncEnabledCache = readEnabledFromDb();
  }
  return syncEnabledCache;
}

export function setSyncEnabled(enabled: boolean): void {
  syncEnabledCache = enabled;
  db.runSync(
    `INSERT INTO sync_state (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [ENABLED_KEY, enabled ? 'true' : 'false']
  );
}

/**
 * Registra uma mudança local no outbox (no-op se a sincronização estiver desativada).
 */
export function recordChange(
  entity: SyncEntity,
  entityId: string,
  op: SyncOp,
  payload: Record<string, unknown> | null
): void {
  if (!isSyncEnabled()) return;
  db.runSync(
    `INSERT INTO sync_outbox (entity, entityId, op, payload, updatedAt)
     VALUES (?, ?, ?, ?, ?)`,
    [entity, entityId, op, payload ? JSON.stringify(payload) : null, new Date().toISOString()]
  );
}

export function getPendingChanges(limit = 500): ChangeRecord[] {
  const rows = db.getAllSync<{
    id: number;
    entity: string;
    entityId: string;
    op: string;
    payload: string | null;
    updatedAt: string;
  }>('SELECT * FROM sync_outbox ORDER BY id ASC LIMIT ?', [limit]);

  return rows.map(r => ({
    id: r.id,
    entity: r.entity as SyncEntity,
    entityId: r.entityId,
    op: r.op as SyncOp,
    payload: r.payload ? (JSON.parse(r.payload) as Record<string, unknown>) : null,
    updatedAt: r.updatedAt,
  }));
}

export function clearPushed(ids: number[]): void {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  db.runSync(`DELETE FROM sync_outbox WHERE id IN (${placeholders})`, ids);
}

export function getPendingCount(): number {
  const row = db.getFirstSync<{ c: number }>('SELECT COUNT(*) as c FROM sync_outbox');
  return row?.c ?? 0;
}

export function getCursor(): string | null {
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM sync_state WHERE key = ?',
    [CURSOR_KEY]
  );
  return row?.value ?? null;
}

export function setCursor(cursor: string): void {
  db.runSync(
    `INSERT INTO sync_state (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [CURSOR_KEY, cursor]
  );
}
