// ============================================
// GERENCIAMENTO DA CHAVE DE CRIPTOGRAFIA DO BANCO
// A chave do SQLCipher é gerada uma única vez e guardada no
// armazenamento seguro do sistema (Keychain no iOS / Keystore no Android),
// nunca em texto puro no app nem em backup.
// ============================================

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const KEY_NAME = 'nails_db_encryption_key';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Retorna a chave de criptografia do banco, criando-a no primeiro uso.
 *
 * A chave fica marcada como WHEN_UNLOCKED_THIS_DEVICE_ONLY: não sai do
 * aparelho e não é incluída em backups. Consequência: ao trocar de aparelho
 * sem sincronização em nuvem (Fase 3), o banco local não poderá ser lido —
 * comportamento esperado até termos backup/sync.
 */
export async function getOrCreateEncryptionKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY_NAME);
  if (existing) return existing;

  const randomBytes = await Crypto.getRandomBytesAsync(32); // 256 bits
  const key = toHex(randomBytes);

  await SecureStore.setItemAsync(KEY_NAME, key, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  return key;
}
