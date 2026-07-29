// ============================================
// HOOK DE PROFISSIONAIS
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { professionalRepository } from '../services/professionalRepository';
import type {
  Professional,
  CreateProfessionalDTO,
  UpdateProfessionalDTO,
  OperationResult,
} from '../types';

export const useProfessionals = () => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfessionals = useCallback(() => {
    try {
      setLoading(true);
      setProfessionals(professionalRepository.getAll());
    } catch (err) {
      console.error('Erro ao carregar profissionais:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfessionals();
  }, [loadProfessionals]);

  const createProfessional = useCallback((data: CreateProfessionalDTO): OperationResult<Professional> => {
    try {
      if (!data.name.trim()) {
        return { success: false, message: 'Digite o nome do profissional' };
      }
      const created = professionalRepository.create(data);
      setProfessionals(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      return { success: true, data: created, message: 'Profissional cadastrado!' };
    } catch (err) {
      console.error('Erro ao criar profissional:', err);
      return { success: false, message: 'Erro ao cadastrar profissional' };
    }
  }, []);

  const updateProfessional = useCallback((id: string, data: UpdateProfessionalDTO): OperationResult<Professional> => {
    try {
      const updated = professionalRepository.update(id, data);
      if (!updated) return { success: false, message: 'Profissional não encontrado' };
      setProfessionals(prev =>
        prev.map(p => (p.id === id ? updated : p)).sort((a, b) => a.name.localeCompare(b.name))
      );
      return { success: true, data: updated, message: 'Profissional atualizado!' };
    } catch (err) {
      console.error('Erro ao atualizar profissional:', err);
      return { success: false, message: 'Erro ao atualizar profissional' };
    }
  }, []);

  const deleteProfessional = useCallback((id: string): OperationResult => {
    try {
      const success = professionalRepository.delete(id);
      if (!success) return { success: false, message: 'Profissional não encontrado' };
      setProfessionals(prev => prev.filter(p => p.id !== id));
      return { success: true, message: 'Profissional removido!' };
    } catch (err) {
      console.error('Erro ao remover profissional:', err);
      return { success: false, message: 'Erro ao remover profissional' };
    }
  }, []);

  return {
    professionals,
    loading,
    loadProfessionals,
    createProfessional,
    updateProfessional,
    deleteProfessional,
  };
};
