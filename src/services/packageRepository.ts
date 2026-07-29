// ============================================
// REPOSITÓRIO DE PACOTES DE SERVIÇOS (SQLite)
// Pacote (packages) + slots (package_slots) com exclusão em cascata.
// API assíncrona preservada para compatibilidade com hooks/telas.
// ============================================

import { db } from '../database/database';
import { generateId, getCurrentTimestamp } from '../utils/helpers';
import type { ServicePackage, CreatePackageDTO, PackageSlot } from '../types';

interface PackageRow {
  id: string;
  clientId: string | null;
  clientName: string;
  createdAt: string;
  updatedAt: string;
}

interface SlotRow {
  id: string;
  packageId: string;
  serviceId: string | null;
  serviceName: string;
  durationMinutes: number;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  appointmentId: string | null;
  status: string;
  orderIndex: number;
}

function slotRowToSlot(row: SlotRow): PackageSlot {
  return {
    id: row.id,
    serviceId: row.serviceId ?? '',
    serviceName: row.serviceName,
    durationMinutes: row.durationMinutes,
    date: row.date ?? undefined,
    startTime: row.startTime ?? undefined,
    endTime: row.endTime ?? undefined,
    appointmentId: row.appointmentId ?? undefined,
    status: row.status as PackageSlot['status'],
  };
}

function loadSlots(packageId: string): PackageSlot[] {
  const rows = db.getAllSync<SlotRow>(
    'SELECT * FROM package_slots WHERE packageId = ? ORDER BY orderIndex ASC',
    [packageId]
  );
  return rows.map(slotRowToSlot);
}

function rowToPackage(row: PackageRow): ServicePackage {
  return {
    id: row.id,
    clientId: row.clientId ?? undefined,
    clientName: row.clientName,
    slots: loadSlots(row.id),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

class LocalPackageRepository {
  async getAllPackages(): Promise<ServicePackage[]> {
    const rows = db.getAllSync<PackageRow>('SELECT * FROM packages ORDER BY createdAt DESC');
    return rows.map(rowToPackage);
  }

  async getById(id: string): Promise<ServicePackage | null> {
    const row = db.getFirstSync<PackageRow>('SELECT * FROM packages WHERE id = ?', [id]);
    return row ? rowToPackage(row) : null;
  }

  async getByClientId(clientId: string): Promise<ServicePackage[]> {
    const rows = db.getAllSync<PackageRow>(
      'SELECT * FROM packages WHERE clientId = ? ORDER BY createdAt DESC',
      [clientId]
    );
    return rows.map(rowToPackage);
  }

  async create(data: CreatePackageDTO): Promise<ServicePackage> {
    const timestamp = getCurrentTimestamp();
    const pkg: ServicePackage = {
      id: generateId(),
      clientId: data.clientId,
      clientName: data.clientName.trim(),
      slots: data.slots.map(s => ({
        id: generateId(),
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        durationMinutes: s.durationMinutes,
        status: 'pending',
      })),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.withTransactionSync(() => {
      db.runSync(
        `INSERT INTO packages (id, clientId, clientName, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?)`,
        [pkg.id, pkg.clientId ?? null, pkg.clientName, pkg.createdAt, pkg.updatedAt]
      );
      pkg.slots.forEach((slot, index) => {
        db.runSync(
          `INSERT INTO package_slots
            (id, packageId, serviceId, serviceName, durationMinutes, date, startTime, endTime,
             appointmentId, status, orderIndex)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            slot.id,
            pkg.id,
            slot.serviceId,
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
    });

    return pkg;
  }

  async updateSlot(
    packageId: string,
    slotId: string,
    update: Partial<PackageSlot>
  ): Promise<ServicePackage | null> {
    const existing = db.getFirstSync<SlotRow>(
      'SELECT * FROM package_slots WHERE id = ? AND packageId = ?',
      [slotId, packageId]
    );
    if (!existing) return null;

    const merged = { ...slotRowToSlot(existing), ...update };
    const timestamp = getCurrentTimestamp();

    db.withTransactionSync(() => {
      db.runSync(
        `UPDATE package_slots
         SET serviceId = ?, serviceName = ?, durationMinutes = ?, date = ?, startTime = ?,
             endTime = ?, appointmentId = ?, status = ?
         WHERE id = ?`,
        [
          merged.serviceId,
          merged.serviceName,
          merged.durationMinutes,
          merged.date ?? null,
          merged.startTime ?? null,
          merged.endTime ?? null,
          merged.appointmentId ?? null,
          merged.status,
          slotId,
        ]
      );
      db.runSync('UPDATE packages SET updatedAt = ? WHERE id = ?', [timestamp, packageId]);
    });

    return this.getById(packageId);
  }

  async cancelSlotByAppointmentId(appointmentId: string): Promise<boolean> {
    const slot = db.getFirstSync<SlotRow>(
      'SELECT * FROM package_slots WHERE appointmentId = ?',
      [appointmentId]
    );
    if (!slot) return false;

    const timestamp = getCurrentTimestamp();
    db.withTransactionSync(() => {
      db.runSync(`UPDATE package_slots SET status = 'cancelled' WHERE id = ?`, [slot.id]);
      db.runSync('UPDATE packages SET updatedAt = ? WHERE id = ?', [timestamp, slot.packageId]);
    });
    return true;
  }

  async delete(id: string): Promise<boolean> {
    // ON DELETE CASCADE remove os package_slots vinculados automaticamente
    const result = db.runSync('DELETE FROM packages WHERE id = ?', [id]);
    return result.changes > 0;
  }
}

export const packageRepository = new LocalPackageRepository();
