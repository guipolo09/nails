// ============================================
// REPOSITÓRIO DE CONFIGURAÇÕES (SQLite)
// Armazena o objeto AppSettings como JSON numa tabela chave-valor.
// API assíncrona preservada para compatibilidade com hooks/telas.
// ============================================

import { db } from '../database/database';
import { buildWeeklyHours } from '../utils/helpers';
import type { AppSettings, UpdateSettingsDTO, ReminderSettings } from '../types';

const SETTINGS_KEY = 'app';

/**
 * Configurações padrão do aplicativo
 */
const buildDefaultSettings = (): AppSettings => {
  const now = new Date().toISOString();
  return {
    businessHours: { start: 8, end: 18 },
    weeklyHours: buildWeeklyHours(8, 18), // todos os dias abertos 8-18 por padrão
    timeSlotInterval: 30,
    theme: 'light',
    holidays: [],
    reminderSettings: {
      appointmentRemindersEnabled: false,
      reminderOffset: 30,
      dailyMorningReminderEnabled: false,
      dailyEveningReminderEnabled: false,
    },
    createdAt: now,
    updatedAt: now,
  };
};

function readRaw(): AppSettings | null {
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [SETTINGS_KEY]
  );
  if (!row) return null;
  try {
    return JSON.parse(row.value) as AppSettings;
  } catch {
    return null;
  }
}

function writeRaw(settings: AppSettings): void {
  db.runSync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [SETTINGS_KEY, JSON.stringify(settings)]
  );
}

/**
 * Repositório local de configurações usando SQLite
 */
export class LocalSettingsRepository {
  /**
   * Obtém as configurações atuais ou retorna/persiste as padrões.
   * Garante retrocompatibilidade com versões que não tinham reminderSettings.
   */
  async getSettings(): Promise<AppSettings> {
    try {
      const settings = readRaw();

      if (!settings) {
        const defaults = buildDefaultSettings();
        writeRaw(defaults);
        return defaults;
      }

      // Migração: adiciona reminderSettings se não existir
      let migrated = settings;
      if (!migrated.reminderSettings) {
        migrated = { ...migrated, reminderSettings: buildDefaultSettings().reminderSettings };
      }
      // Migração: deriva weeklyHours do horário global se ainda não existir
      if (!migrated.weeklyHours) {
        migrated = {
          ...migrated,
          weeklyHours: buildWeeklyHours(migrated.businessHours.start, migrated.businessHours.end),
        };
      }
      if (migrated !== settings) {
        writeRaw(migrated);
        return migrated;
      }

      return settings;
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      return buildDefaultSettings();
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

      writeRaw(updatedSettings);
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
      const defaults = buildDefaultSettings();
      writeRaw(defaults);
      return defaults;
    } catch (error) {
      console.error('Erro ao resetar configurações:', error);
      throw error;
    }
  }
}

// Exporta instância única do repositório
export const settingsRepository = new LocalSettingsRepository();
