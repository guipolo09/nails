// ============================================
// REPOSITÓRIO DE PROFISSIONAIS (SQLite)
// ============================================

import { db } from '../database/database';
import { generateId, getCurrentTimestamp } from '../utils/helpers';
import { recordChange } from '../sync/outbox';
import type { Professional, CreateProfessionalDTO, UpdateProfessionalDTO } from '../types';

interface ProfessionalRow {
  id: string;
  name: string;
  active: number;
  createdAt: string;
  updatedAt: string;
}

function rowToProfessional(row: ProfessionalRow): Professional {
  return {
    id: row.id,
    name: row.name,
    active: row.active === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function professionalToRow(p: Professional): Record<string, unknown> {
  return {
    id: p.id,
    name: p.name,
    active: p.active ? 1 : 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

class LocalProfessionalRepository {
  getAll(): Professional[] {
    const rows = db.getAllSync<ProfessionalRow>('SELECT * FROM professionals ORDER BY name ASC');
    return rows.map(rowToProfessional);
  }

  getActive(): Professional[] {
    const rows = db.getAllSync<ProfessionalRow>(
      'SELECT * FROM professionals WHERE active = 1 ORDER BY name ASC'
    );
    return rows.map(rowToProfessional);
  }

  getById(id: string): Professional | null {
    const row = db.getFirstSync<ProfessionalRow>('SELECT * FROM professionals WHERE id = ?', [id]);
    return row ? rowToProfessional(row) : null;
  }

  create(data: CreateProfessionalDTO): Professional {
    const timestamp = getCurrentTimestamp();
    const professional: Professional = {
      id: generateId(),
      name: data.name.trim(),
      active: data.active ?? true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.runSync(
      `INSERT INTO professionals (id, name, active, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?)`,
      [
        professional.id,
        professional.name,
        professional.active ? 1 : 0,
        professional.createdAt,
        professional.updatedAt,
      ]
    );

    recordChange('professionals', professional.id, 'upsert', professionalToRow(professional));
    return professional;
  }

  update(id: string, data: UpdateProfessionalDTO): Professional | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const updated: Professional = {
      ...existing,
      name: data.name?.trim() ?? existing.name,
      active: data.active ?? existing.active,
      updatedAt: getCurrentTimestamp(),
    };

    db.runSync(
      `UPDATE professionals SET name = ?, active = ?, updatedAt = ? WHERE id = ?`,
      [updated.name, updated.active ? 1 : 0, updated.updatedAt, id]
    );

    recordChange('professionals', id, 'upsert', professionalToRow(updated));
    return updated;
  }

  delete(id: string): boolean {
    const result = db.runSync('DELETE FROM professionals WHERE id = ?', [id]);
    if (result.changes > 0) {
      recordChange('professionals', id, 'delete', null);
    }
    return result.changes > 0;
  }
}

export const professionalRepository = new LocalProfessionalRepository();
