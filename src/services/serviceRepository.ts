// ============================================
// REPOSITÓRIO DE SERVIÇOS (SQLite)
// API assíncrona preservada para compatibilidade com hooks/telas
// ============================================

import { db } from '../database/database';
import { generateId, getCurrentTimestamp } from '../utils/helpers';
import { recordChange } from '../sync/outbox';
import type { Service, CreateServiceDTO, UpdateServiceDTO, Repository } from '../types';

function serviceToRow(s: Service): Record<string, unknown> {
  return {
    id: s.id,
    name: s.name,
    durationMinutes: s.durationMinutes,
    priceCents: s.priceCents ?? null,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

/**
 * Interface do repositório de serviços
 * Preparada para implementação com API REST
 */
export interface IServiceRepository extends Repository<Service, CreateServiceDTO, UpdateServiceDTO> {
  getAll(): Promise<Service[]>;
  getById(id: string): Promise<Service | null>;
  create(data: CreateServiceDTO): Promise<Service>;
  update(id: string, data: UpdateServiceDTO): Promise<Service | null>;
  delete(id: string): Promise<boolean>;
}

interface ServiceRow {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number | null;
  createdAt: string;
  updatedAt: string;
}

function rowToService(row: ServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    durationMinutes: row.durationMinutes,
    priceCents: row.priceCents ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Implementação local do repositório usando SQLite
 */
class LocalServiceRepository implements IServiceRepository {
  async getAll(): Promise<Service[]> {
    const rows = db.getAllSync<ServiceRow>('SELECT * FROM services ORDER BY name ASC');
    return rows.map(rowToService);
  }

  async getById(id: string): Promise<Service | null> {
    const row = db.getFirstSync<ServiceRow>('SELECT * FROM services WHERE id = ?', [id]);
    return row ? rowToService(row) : null;
  }

  async create(data: CreateServiceDTO): Promise<Service> {
    const timestamp = getCurrentTimestamp();
    const service: Service = {
      id: generateId(),
      name: data.name.trim(),
      durationMinutes: data.durationMinutes,
      priceCents: data.priceCents,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.runSync(
      `INSERT INTO services (id, name, durationMinutes, priceCents, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [service.id, service.name, service.durationMinutes, service.priceCents ?? null, service.createdAt, service.updatedAt]
    );

    recordChange('services', service.id, 'upsert', serviceToRow(service));
    return service;
  }

  async update(id: string, data: UpdateServiceDTO): Promise<Service | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated: Service = {
      ...existing,
      name: data.name?.trim() || existing.name,
      durationMinutes: data.durationMinutes ?? existing.durationMinutes,
      priceCents: data.priceCents !== undefined ? data.priceCents : existing.priceCents,
      updatedAt: getCurrentTimestamp(),
    };

    db.runSync(
      `UPDATE services SET name = ?, durationMinutes = ?, priceCents = ?, updatedAt = ? WHERE id = ?`,
      [updated.name, updated.durationMinutes, updated.priceCents ?? null, updated.updatedAt, id]
    );

    recordChange('services', id, 'upsert', serviceToRow(updated));
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = db.runSync('DELETE FROM services WHERE id = ?', [id]);
    if (result.changes > 0) {
      recordChange('services', id, 'delete', null);
    }
    return result.changes > 0;
  }
}

// Singleton para uso em todo o app
export const serviceRepository: IServiceRepository = new LocalServiceRepository();
