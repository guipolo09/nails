// ============================================
// HOOK DE CLIENTES
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { clientRepository } from '../services/clientRepository';
import type { Client, CreateClientDTO, UpdateClientDTO, OperationResult } from '../types';

export const useClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClients = useCallback(() => {
    try {
      setLoading(true);
      const data = clientRepository.getAll();
      setClients(data);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const createClient = useCallback((data: CreateClientDTO): OperationResult<Client> => {
    try {
      if (!data.name.trim()) {
        return { success: false, message: 'Digite o nome da cliente' };
      }
      const created = clientRepository.create(data);
      setClients(prev =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      return { success: true, data: created, message: 'Cliente cadastrada com sucesso!' };
    } catch (err) {
      console.error('Erro ao criar cliente:', err);
      return { success: false, message: 'Erro ao cadastrar cliente' };
    }
  }, []);

  const updateClient = useCallback((id: string, data: UpdateClientDTO): OperationResult<Client> => {
    try {
      const updated = clientRepository.update(id, data);
      if (!updated) return { success: false, message: 'Cliente não encontrada' };
      setClients(prev =>
        prev.map(c => c.id === id ? updated : c).sort((a, b) => a.name.localeCompare(b.name))
      );
      return { success: true, data: updated, message: 'Cliente atualizada!' };
    } catch (err) {
      console.error('Erro ao atualizar cliente:', err);
      return { success: false, message: 'Erro ao atualizar cliente' };
    }
  }, []);

  const deleteClient = useCallback((id: string): OperationResult => {
    try {
      const success = clientRepository.delete(id);
      if (!success) return { success: false, message: 'Cliente não encontrada' };
      setClients(prev => prev.filter(c => c.id !== id));
      return { success: true, message: 'Cliente removida!' };
    } catch (err) {
      console.error('Erro ao remover cliente:', err);
      return { success: false, message: 'Erro ao remover cliente' };
    }
  }, []);

  const getClientById = useCallback((id: string): Client | null => {
    return clientRepository.getById(id);
  }, []);

  return {
    clients,
    loading,
    loadClients,
    createClient,
    updateClient,
    deleteClient,
    getClientById,
  };
};
