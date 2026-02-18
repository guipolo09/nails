// ============================================
// BANCO DE DADOS SQLite
// Persistência local para dados de clientes
// ============================================

import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('nails.db');

/**
 * Inicializa as tabelas do banco de dados.
 * Deve ser chamado uma vez na inicialização do app.
 */
export const initDatabase = (): void => {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS clients (
      id         TEXT PRIMARY KEY NOT NULL,
      name       TEXT NOT NULL,
      phone      TEXT,
      notes      TEXT,
      tier       TEXT NOT NULL DEFAULT 'regular',
      createdAt  TEXT NOT NULL,
      updatedAt  TEXT NOT NULL
    );
  `);
};
