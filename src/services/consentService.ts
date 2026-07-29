// ============================================
// SERVIÇO DE CONSENTIMENTO (LGPD)
// Registra o aceite da política de privacidade, com data/hora, na tabela
// `settings` do banco criptografado.
// ============================================

import { db } from '../database/database';

const CONSENT_KEY = 'lgpdConsentV1';

/**
 * Retorna a data/hora ISO do consentimento, ou null se ainda não houve aceite.
 */
export function getConsentDate(): string | null {
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [CONSENT_KEY]
  );
  return row?.value ?? null;
}

export function hasConsented(): boolean {
  return getConsentDate() !== null;
}

/**
 * Registra o consentimento com a data/hora atual.
 */
export function recordConsent(): void {
  db.runSync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [CONSENT_KEY, new Date().toISOString()]
  );
}
