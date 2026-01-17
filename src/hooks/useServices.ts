// ============================================
// HOOK DE GERENCIAMENTO DE SERVIÇOS
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { serviceRepository } from '../services/serviceRepository';
import type { Service, CreateServiceDTO, UpdateServiceDTO, OperationResult } from '../types';
import { MESSAGES } from '../utils/constants';

interface UseServicesReturn {
  services: Service[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createService: (data: CreateServiceDTO) => Promise<OperationResult<Service>>;
  updateService: (id: string, data: UpdateServiceDTO) => Promise<OperationResult<Service>>;
  deleteService: (id: string) => Promise<OperationResult>;
  getServiceById: (id: string) => Service | undefined;
}

export const useServices = (): UseServicesReturn => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await serviceRepository.getAll();
      setServices(data);
    } catch (err) {
      setError(MESSAGES.SERVICE_ERROR);
      console.error('Erro ao carregar serviços:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const createService = useCallback(async (data: CreateServiceDTO): Promise<OperationResult<Service>> => {
    try {
      const newService = await serviceRepository.create(data);
      setServices(prev => [...prev, newService]);
      return {
        success: true,
        data: newService,
        message: MESSAGES.SERVICE_CREATED,
      };
    } catch (err) {
      console.error('Erro ao criar serviço:', err);
      return {
        success: false,
        message: MESSAGES.SERVICE_ERROR,
      };
    }
  }, []);

  const updateService = useCallback(async (id: string, data: UpdateServiceDTO): Promise<OperationResult<Service>> => {
    try {
      const updated = await serviceRepository.update(id, data);
      if (!updated) {
        return {
          success: false,
          message: MESSAGES.SERVICE_ERROR,
        };
      }
      setServices(prev => prev.map(s => (s.id === id ? updated : s)));
      return {
        success: true,
        data: updated,
        message: MESSAGES.SERVICE_UPDATED,
      };
    } catch (err) {
      console.error('Erro ao atualizar serviço:', err);
      return {
        success: false,
        message: MESSAGES.SERVICE_ERROR,
      };
    }
  }, []);

  const deleteService = useCallback(async (id: string): Promise<OperationResult> => {
    try {
      const success = await serviceRepository.delete(id);
      if (!success) {
        return {
          success: false,
          message: MESSAGES.SERVICE_ERROR,
        };
      }
      setServices(prev => prev.filter(s => s.id !== id));
      return {
        success: true,
        message: MESSAGES.SERVICE_DELETED,
      };
    } catch (err) {
      console.error('Erro ao excluir serviço:', err);
      return {
        success: false,
        message: MESSAGES.SERVICE_ERROR,
      };
    }
  }, []);

  const getServiceById = useCallback((id: string): Service | undefined => {
    return services.find(s => s.id === id);
  }, [services]);

  return {
    services,
    loading,
    error,
    refresh: loadServices,
    createService,
    updateService,
    deleteService,
    getServiceById,
  };
};
