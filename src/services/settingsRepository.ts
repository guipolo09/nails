// ============================================
// REPOSITÓRIO DE CONFIGURAÇÕES
// Gerencia armazenamento e recuperação de configurações do app
// ============================================

import { getItem, setItem } from '../storage/asyncStorage';
import { STORAGE_KEYS } from '../utils/constants';
import type { AppSettings, UpdateSettingsDTO, ReminderSettings } from '../types';

/**
 * Configurações padrão do aplicativo
 */
const DEFAULT_SETTINGS: AppSettings = {
  businessHours: {
    start: 8, // 8:00
    end: 18, // 18:00
  },
  timeSlotInterval: 30, // 30 minutos
  theme: 'light',
  holidays: [],
  reminderSettings: {
    appointmentRemindersEnabled: false,
    reminderOffset: 30,
    dailyMorningReminderEnabled: false,
    dailyEveningReminderEnabled: false,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Repositório local de configurações usando AsyncStorage
 */
export class LocalSettingsRepository {
  /**
   * Obtém as configurações atuais ou retorna configurações padrão.
   * Garante retrocompatibilidade com versões anteriores que não tinham reminderSettings.
   */
  async getSettings(): Promise<AppSettings> {
    try {
      const settings = await getItem<AppSettings>(STORAGE_KEYS.SETTINGS);

      if (!settings) {
        // Se não existir configuração, salva as configurações padrão
        await setItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }

      // Migração: adiciona reminderSettings se não existir
      if (!settings.reminderSettings) {
        const migrated: AppSettings = {
          ...settings,
          reminderSettings: DEFAULT_SETTINGS.reminderSettings,
        };
        await setItem(STORAGE_KEYS.SETTINGS, migrated);
        return migrated;
      }

      return settings;
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Atualiza as configurações do sistema
   */
  async updateSettings(updates: UpdateSettingsDTO): Promise<AppSettings> {
    try {
      const currentSettings = await this.getSettings();

      const updatedSettings: AppSettings = {
        ...currentSettings,
        ...updates,
        businessHours: updates.businessHours
          ? { ...currentSettings.businessHours, ...updates.businessHours }
          : currentSettings.businessHours,
        reminderSettings: updates.reminderSettings
          ? { ...currentSettings.reminderSettings, ...updates.reminderSettings }
          : currentSettings.reminderSettings,
        updatedAt: new Date().toISOString(),
      };

      await setItem(STORAGE_KEYS.SETTINGS, updatedSettings);
      return updatedSettings;
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      throw error;
    }
  }

  /**
   * Atualiza as configurações de lembretes
   */
  async updateReminderSettings(updates: Partial<ReminderSettings>): Promise<AppSettings> {
    return this.updateSettings({ reminderSettings: updates });
  }

  /**
   * Adiciona um feriado à lista
   */
  async addHoliday(date: string): Promise<AppSettings> {
    try {
      const settings = await this.getSettings();

      // Verifica se o feriado já existe
      if (settings.holidays.includes(date)) {
        return settings;
      }

      const updatedHolidays = [...settings.holidays, date].sort();
      return await this.updateSettings({ holidays: updatedHolidays });
    } catch (error) {
      console.error('Erro ao adicionar feriado:', error);
      throw error;
    }
  }

  /**
   * Remove um feriado da lista
   */
  async removeHoliday(date: string): Promise<AppSettings> {
    try {
      const settings = await this.getSettings();
      const updatedHolidays = settings.holidays.filter(h => h !== date);
      return await this.updateSettings({ holidays: updatedHolidays });
    } catch (error) {
      console.error('Erro ao remover feriado:', error);
      throw error;
    }
  }

  /**
   * Verifica se uma data é feriado
   */
  async isHoliday(date: string): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      return settings.holidays.includes(date);
    } catch (error) {
      console.error('Erro ao verificar feriado:', error);
      return false;
    }
  }

  /**
   * Reseta as configurações para os valores padrão
   */
  async resetToDefaults(): Promise<AppSettings> {
    try {
      await setItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Erro ao resetar configurações:', error);
      throw error;
    }
  }
}

// Exporta instância única do repositório
export const settingsRepository = new LocalSettingsRepository();
