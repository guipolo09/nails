// ============================================
// HOOK DE CONFIGURAÇÕES
// Gerencia estado e operações de configurações do sistema
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { settingsRepository } from '../services/settingsRepository';
import type { AppSettings, UpdateSettingsDTO, TimeSlotInterval, ThemeMode, ReminderSettings } from '../types';

/**
 * Hook customizado para gerenciar configurações do sistema
 */
export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carrega as configurações
   */
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await settingsRepository.getSettings();
      setSettings(data);
    } catch (err) {
      setError('Erro ao carregar configurações');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Atualiza as configurações
   */
  const updateSettings = useCallback(async (updates: UpdateSettingsDTO) => {
    try {
      setError(null);
      const updated = await settingsRepository.updateSettings(updates);
      setSettings(updated);
      return { success: true, data: updated };
    } catch (err) {
      setError('Erro ao atualizar configurações');
      console.error(err);
      return { success: false, error: 'Erro ao atualizar configurações' };
    }
  }, []);

  /**
   * Atualiza horário de funcionamento
   */
  const updateBusinessHours = useCallback(async (start: number, end: number) => {
    if (start >= end) {
      setError('Horário de início deve ser menor que horário de fim');
      return { success: false, error: 'Horário inválido' };
    }
    if (start < 0 || start > 23 || end < 0 || end > 23) {
      setError('Horários devem estar entre 0 e 23');
      return { success: false, error: 'Horário inválido' };
    }
    return await updateSettings({ businessHours: { start, end } });
  }, [updateSettings]);

  /**
   * Atualiza intervalo de slots
   */
  const updateTimeSlotInterval = useCallback(async (interval: TimeSlotInterval) => {
    return await updateSettings({ timeSlotInterval: interval });
  }, [updateSettings]);

  /**
   * Atualiza tema
   */
  const updateTheme = useCallback(async (theme: ThemeMode) => {
    return await updateSettings({ theme });
  }, [updateSettings]);

  /**
   * Adiciona um feriado
   */
  const addHoliday = useCallback(async (date: string) => {
    try {
      setError(null);
      const updated = await settingsRepository.addHoliday(date);
      setSettings(updated);
      return { success: true, data: updated };
    } catch (err) {
      setError('Erro ao adicionar feriado');
      console.error(err);
      return { success: false, error: 'Erro ao adicionar feriado' };
    }
  }, []);

  /**
   * Remove um feriado
   */
  const removeHoliday = useCallback(async (date: string) => {
    try {
      setError(null);
      const updated = await settingsRepository.removeHoliday(date);
      setSettings(updated);
      return { success: true, data: updated };
    } catch (err) {
      setError('Erro ao remover feriado');
      console.error(err);
      return { success: false, error: 'Erro ao remover feriado' };
    }
  }, []);

  /**
   * Verifica se uma data é feriado
   */
  const isHoliday = useCallback((date: string): boolean => {
    return settings?.holidays.includes(date) || false;
  }, [settings]);

  /**
   * Atualiza configurações de lembretes
   */
  const updateReminderSettings = useCallback(async (updates: Partial<ReminderSettings>) => {
    try {
      setError(null);
      const updated = await settingsRepository.updateReminderSettings(updates);
      setSettings(updated);
      return { success: true, data: updated };
    } catch (err) {
      setError('Erro ao atualizar lembretes');
      console.error(err);
      return { success: false, error: 'Erro ao atualizar lembretes' };
    }
  }, []);

  /**
   * Reseta configurações para padrão
   */
  const resetToDefaults = useCallback(async () => {
    try {
      setError(null);
      const defaults = await settingsRepository.resetToDefaults();
      setSettings(defaults);
      return { success: true, data: defaults };
    } catch (err) {
      setError('Erro ao resetar configurações');
      console.error(err);
      return { success: false, error: 'Erro ao resetar configurações' };
    }
  }, []);

  // Carrega as configurações ao montar o componente
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    error,
    loadSettings,
    updateSettings,
    updateBusinessHours,
    updateTimeSlotInterval,
    updateTheme,
    addHoliday,
    removeHoliday,
    isHoliday,
    updateReminderSettings,
    resetToDefaults,
  };
};
