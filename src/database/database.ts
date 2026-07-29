// ============================================
// BANCO DE DADOS SQLite CRIPTOGRAFADO (SQLCipher via op-sqlite)
// Persistência local unificada e criptografada em repouso.
//
// Para manter os repositórios inalterados, expomos um objeto `db` com a MESMA
// interface síncrona usada antes (getAllSync/getFirstSync/runSync/execSync/
// withTransactionSync), agora implementada sobre o op-sqlite.
//
// IMPORTANTE: a criptografia SQLCipher exige o flag no package.json:
//   "op-sqlite": { "sqlcipher": true }
// e um DEV BUILD (não funciona no Expo Go nem na Web).
// ============================================

import { open, type DB, type Scalar } from '@op-engineering/op-sqlite';
import { getOrCreateEncryptionKey } from './encryption';

// Nome do banco criptografado. Diferente do legado em texto puro ('nails.db')
// para permitir a migração única de dados na primeira execução.
const ENCRYPTED_DB_NAME = 'nailsx.db';
const LEGACY_PLAINTEXT_DB_NAME = 'nails.db';
const LEGACY_MIGRATION_FLAG = 'encMigratedFromPlaintextV1';

let connection: DB | null = null;

function conn(): DB {
  if (!connection) {
    throw new Error('Banco não inicializado. Chame initDatabase() antes de acessar o db.');
  }
  return connection;
}

/**
 * Divide um script SQL em statements individuais (op-sqlite executa um por vez).
 * O esquema não contém ';' dentro de literais, então o split simples é seguro.
 */
function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Adaptador com a mesma interface síncrona usada pelos repositórios.
 */
export const db = {
  getAllSync<T>(sql: string, params?: Scalar[]): T[] {
    return conn().executeSync(sql, params).rows as T[];
  },

  getFirstSync<T>(sql: string, params?: Scalar[]): T | null {
    const rows = conn().executeSync(sql, params).rows;
    return (rows[0] as T) ?? null;
  },

  runSync(sql: string, params?: Scalar[]): { changes: number; lastInsertRowId?: number } {
    const result = conn().executeSync(sql, params);
    return { changes: result.rowsAffected ?? 0, lastInsertRowId: result.insertId };
  },

  execSync(sqlBatch: string): void {
    const c = conn();
    for (const stmt of splitStatements(sqlBatch)) {
      c.executeSync(stmt);
    }
  },

  /**
   * Transação síncrona (BEGIN/COMMIT/ROLLBACK). Garante atomicidade da
   * checagem de conflito + inserção de agendamento, entre outras operações.
   */
  withTransactionSync(fn: () => void): void {
    const c = conn();
    c.executeSync('BEGIN');
    try {
      fn();
      c.executeSync('COMMIT');
    } catch (error) {
      try {
        c.executeSync('ROLLBACK');
      } catch {
        // ignora erro de rollback; propaga o erro original abaixo
      }
      throw error;
    }
  },
};

/**
 * Cria as tabelas do banco (idempotente), na ordem de dependência.
 */
function createSchema(): void {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS clients (
      id         TEXT PRIMARY KEY NOT NULL,
      name       TEXT NOT NULL,
      phone      TEXT,
      notes      TEXT,
      tier       TEXT NOT NULL DEFAULT 'regular',
      createdAt  TEXT NOT NULL,
      updatedAt  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS services (
      id              TEXT PRIMARY KEY NOT NULL,
      name            TEXT NOT NULL,
      durationMinutes INTEGER NOT NULL,
      priceCents      INTEGER,
      createdAt       TEXT NOT NULL,
      updatedAt       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS professionals (
      id         TEXT PRIMARY KEY NOT NULL,
      name       TEXT NOT NULL,
      active     INTEGER NOT NULL DEFAULT 1,
      createdAt  TEXT NOT NULL,
      updatedAt  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS packages (
      id          TEXT PRIMARY KEY NOT NULL,
      clientId    TEXT REFERENCES clients(id) ON DELETE SET NULL,
      clientName  TEXT NOT NULL,
      createdAt   TEXT NOT NULL,
      updatedAt   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id                TEXT PRIMARY KEY NOT NULL,
      clientId          TEXT REFERENCES clients(id) ON DELETE SET NULL,
      clientName        TEXT NOT NULL,
      serviceId         TEXT REFERENCES services(id) ON DELETE SET NULL,
      serviceName       TEXT NOT NULL,
      date              TEXT NOT NULL,
      startTime         TEXT NOT NULL,
      endTime           TEXT NOT NULL,
      calendarEventId   TEXT,
      attendanceStatus  TEXT,
      priceCents        INTEGER,
      paymentStatus     TEXT,
      professionalId    TEXT,
      professionalName  TEXT,
      recurrenceGroupId TEXT,
      packageId         TEXT REFERENCES packages(id) ON DELETE SET NULL,
      createdAt         TEXT NOT NULL,
      updatedAt         TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_appt_date   ON appointments(date);
    CREATE INDEX IF NOT EXISTS idx_appt_client ON appointments(clientId);
    CREATE INDEX IF NOT EXISTS idx_appt_group  ON appointments(recurrenceGroupId);

    CREATE TABLE IF NOT EXISTS package_slots (
      id              TEXT PRIMARY KEY NOT NULL,
      packageId       TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
      serviceId       TEXT,
      serviceName     TEXT NOT NULL,
      durationMinutes INTEGER NOT NULL,
      date            TEXT,
      startTime       TEXT,
      endTime         TEXT,
      appointmentId   TEXT REFERENCES appointments(id) ON DELETE SET NULL,
      status          TEXT NOT NULL DEFAULT 'pending',
      orderIndex      INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_slot_package ON package_slots(packageId);
    CREATE INDEX IF NOT EXISTS idx_slot_appt    ON package_slots(appointmentId);

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    -- Fila de mudanças locais pendentes de envio para a nuvem (outbox pattern).
    CREATE TABLE IF NOT EXISTS sync_outbox (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      entity    TEXT NOT NULL,
      entityId  TEXT NOT NULL,
      op        TEXT NOT NULL,          -- 'upsert' | 'delete'
      payload   TEXT,                   -- JSON da linha (null em delete)
      updatedAt TEXT NOT NULL
    );

    -- Estado da sincronização (cursor de pull, flag de ativação, etc.)
    CREATE TABLE IF NOT EXISTS sync_state (
      key   TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
}

/**
 * Adiciona uma coluna a uma tabela existente, se ainda não existir (idempotente).
 * Necessário porque CREATE TABLE IF NOT EXISTS não altera tabelas já criadas.
 */
function ensureColumn(table: string, column: string, ddl: string): void {
  const cols = conn().executeSync(`PRAGMA table_info(${table})`).rows as { name: string }[];
  if (!cols.some(c => c.name === column)) {
    conn().executeSync(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

/**
 * Aplica upgrades de esquema em bancos já existentes (colunas novas por fase).
 */
function runSchemaUpgrades(): void {
  // Fase 4 — camada comercial
  ensureColumn('appointments', 'priceCents', 'priceCents INTEGER');
  ensureColumn('appointments', 'paymentStatus', 'paymentStatus TEXT');
  // Fase 5 — profissionais
  ensureColumn('appointments', 'professionalId', 'professionalId TEXT');
  ensureColumn('appointments', 'professionalName', 'professionalName TEXT');
}

const MIGRATED_TABLES = [
  'clients',
  'services',
  'packages',
  'appointments',
  'package_slots',
  'settings',
] as const;

function copyTable(from: DB, tableName: string): void {
  const result = from.executeSync(`SELECT * FROM ${tableName}`);
  for (const row of result.rows) {
    const cols = Object.keys(row);
    if (cols.length === 0) continue;
    const placeholders = cols.map(() => '?').join(', ');
    const values = cols.map(c => row[c] as Scalar);
    db.runSync(
      `INSERT OR IGNORE INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})`,
      values
    );
  }
}

/**
 * Copia dados de um eventual banco legado em TEXTO PURO ('nails.db', criado
 * pela Fase 0) para o banco criptografado. Idempotente e totalmente defensivo:
 * qualquer falha é registrada e não bloqueia a inicialização do app.
 */
function migrateLegacyPlaintextDb(): void {
  const already = db.getFirstSync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [LEGACY_MIGRATION_FLAG]
  );
  if (already?.value === 'true') return;

  let legacy: DB | null = null;
  try {
    // Abre sem chave: o SQLCipher lê arquivos em texto puro quando nenhuma
    // chave é fornecida. Se não existir, um arquivo vazio é criado (inofensivo).
    legacy = open({ name: LEGACY_PLAINTEXT_DB_NAME });

    const hasData = legacy.executeSync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='clients'"
    );
    if (hasData.rows.length > 0) {
      db.withTransactionSync(() => {
        for (const table of MIGRATED_TABLES) {
          try {
            copyTable(legacy as DB, table);
          } catch (err) {
            console.error(`Migração cripto: falha ao copiar tabela ${table}:`, err);
          }
        }
      });
    }
  } catch (error) {
    console.error('Migração cripto (texto puro -> criptografado) falhou:', error);
  } finally {
    try {
      legacy?.close();
    } catch {
      // ignora
    }
    // Marca como concluída mesmo em falha parcial, para não repetir a cópia.
    db.runSync(
      `INSERT INTO settings (key, value) VALUES (?, 'true')
       ON CONFLICT(key) DO UPDATE SET value = 'true'`,
      [LEGACY_MIGRATION_FLAG]
    );
  }
}

/**
 * Inicializa o banco criptografado. DEVE ser chamado (e aguardado) na
 * inicialização do app, ANTES de qualquer acesso aos repositórios.
 */
export const initDatabase = async (): Promise<void> => {
  if (connection) return;

  const encryptionKey = await getOrCreateEncryptionKey();
  connection = open({ name: ENCRYPTED_DB_NAME, encryptionKey });

  createSchema();
  runSchemaUpgrades();
  migrateLegacyPlaintextDb();
};
