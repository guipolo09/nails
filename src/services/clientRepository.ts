// ============================================
// REPOSITÓRIO DE CLIENTES (SQLite)
// ============================================

import { db } from '../database/database';
import { generateId, getCurrentTimestamp } from '../utils/helpers';
import { recordChange } from '../sync/outbox';
import type { Client, CreateClientDTO, UpdateClientDTO } from '../types';

function clientToRow(c: Client): Record<string, unknown> {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone ?? null,
    notes: c.notes ?? null,
    tier: c.tier,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

interface ClientRow {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  tier: string;
  createdAt: string;
  updatedAt: string;
}

function rowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    notes: row.notes ?? undefined,
    tier: row.tier as Client['tier'],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

class LocalClientRepository {
  getAll(): Client[] {
    const rows = db.getAllSync<ClientRow>(
      'SELECT * FROM clients ORDER BY name ASC'
    );
    return rows.map(rowToClient);
  }

  getById(id: string): Client | null {
    const row = db.getFirstSync<ClientRow>(
      'SELECT * FROM clients WHERE id = ?',
      [id]
    );
    return row ? rowToClient(row) : null;
  }

  search(query: string): Client[] {
    if (!query.trim()) return this.getAll();
    const rows = db.getAllSync<ClientRow>(
      'SELECT * FROM clients WHERE name LIKE ? ORDER BY name ASC',
      [`%${query.trim()}%`]
    );
    return rows.map(rowToClient);
  }

  create(data: CreateClientDTO): Client {
    const timestamp = getCurrentTimestamp();
    const client: Client = {
      id: generateId(),
      name: data.name.trim(),
      phone: data.phone?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      tier: data.tier ?? 'regular',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.runSync(
      `INSERT INTO clients (id, name, phone, notes, tier, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        client.id,
        client.name,
        client.phone ?? null,
        client.notes ?? null,
        client.tier,
        client.createdAt,
        client.updatedAt,
      ]
    );

    recordChange('clients', client.id, 'upsert', clientToRow(client));
    return client;
  }

  update(id: string, data: UpdateClientDTO): Client | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const updated: Client = {
      ...existing,
      name: data.name?.trim() ?? existing.name,
      phone: data.phone !== undefined ? data.phone?.trim() || undefined : existing.phone,
      notes: data.notes !== undefined ? data.notes?.trim() || undefined : existing.notes,
      tier: data.tier ?? existing.tier,
      updatedAt: getCurrentTimestamp(),
    };

    db.runSync(
      `UPDATE clients SET name = ?, phone = ?, notes = ?, tier = ?, updatedAt = ?
       WHERE id = ?`,
      [
        updated.name,
        updated.phone ?? null,
        updated.notes ?? null,
        updated.tier,
        updated.updatedAt,
        id,
      ]
    );

    recordChange('clients', id, 'upsert', clientToRow(updated));
    return updated;
  }

  delete(id: string): boolean {
    const result = db.runSync('DELETE FROM clients WHERE id = ?', [id]);
    if (result.changes > 0) {
      recordChange('clients', id, 'delete', null);
    }
    return result.changes > 0;
  }
}

export const clientRepository = new LocalClientRepository();
