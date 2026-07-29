// ============================================
// HOOK DE PACOTES DE SERVIÇOS
// ============================================

import { useState, useCallback } from 'react';
import { packageRepository } from '../services/packageRepository';
import type { ServicePackage, CreatePackageDTO, PackageSlot, OperationResult } from '../types';

export const usePackages = () => {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPackages = useCallback(async () => {
    try {
      const data = await packageRepository.getAllPackages();
      setPackages(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPackage = useCallback(
    async (data: CreatePackageDTO): Promise<OperationResult<ServicePackage>> => {
      try {
        const pkg = await packageRepository.create(data);
        setPackages(prev => [pkg, ...prev]);
        return { success: true, data: pkg, message: 'Pacote criado com sucesso!' };
      } catch {
        return { success: false, message: 'Erro ao criar pacote' };
      }
    },
    []
  );

  const scheduleSlot = useCallback(
    async (
      packageId: string,
      slotId: string,
      slotUpdate: Pick<PackageSlot, 'date' | 'startTime' | 'endTime' | 'appointmentId'>
    ): Promise<OperationResult<ServicePackage>> => {
      try {
        const updated = await packageRepository.updateSlot(packageId, slotId, {
          ...slotUpdate,
          status: 'scheduled',
        });
        if (!updated) return { success: false, message: 'Pacote não encontrado' };
        setPackages(prev => prev.map(p => (p.id === packageId ? updated : p)));
        return { success: true, data: updated, message: 'Horário agendado com sucesso!' };
      } catch {
        return { success: false, message: 'Erro ao agendar horário' };
      }
    },
    []
  );

  const deletePackage = useCallback(
    async (id: string): Promise<OperationResult> => {
      try {
        const ok = await packageRepository.delete(id);
        if (ok) setPackages(prev => prev.filter(p => p.id !== id));
        return { success: ok, message: ok ? 'Pacote removido' : 'Erro ao remover pacote' };
      } catch {
        return { success: false, message: 'Erro ao remover pacote' };
      }
    },
    []
  );

  const getPackageById = useCallback(
    (id: string) => packages.find(p => p.id === id) ?? null,
    [packages]
  );

  const renewPackage = useCallback(
    async (pkg: ServicePackage): Promise<OperationResult<ServicePackage>> => {
      try {
        const newPkg = await packageRepository.create({
          clientId: pkg.clientId,
          clientName: pkg.clientName,
          slots: pkg.slots.map(s => ({
            serviceId: s.serviceId,
            serviceName: s.serviceName,
            durationMinutes: s.durationMinutes,
          })),
        });
        setPackages(prev => [newPkg, ...prev]);
        return { success: true, data: newPkg, message: 'Pacote renovado com sucesso!' };
      } catch {
        return { success: false, message: 'Erro ao renovar pacote' };
      }
    },
    []
  );

  return {
    packages,
    loading,
    loadPackages,
    createPackage,
    scheduleSlot,
    deletePackage,
    getPackageById,
    renewPackage,
  };
};
