// ============================================
// SERVIÇO DE AUTENTICAÇÃO / BLOQUEIO DO APP
// PIN (hash com salt) + biometria. Configuração guardada no SecureStore.
//
// Observação de segurança: o PIN é um GATE de acesso à UI, não a chave de
// criptografia do banco (essa é uma chave de 256 bits no SecureStore —
// ver database/encryption.ts). Por isso SHA-256 com salt é suficiente aqui.
// ============================================

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';

const K_LOCK_ENABLED = 'nails_lock_enabled';
const K_PIN_HASH = 'nails_pin_hash';
const K_PIN_SALT = 'nails_pin_salt';
const K_BIOMETRIC_ENABLED = 'nails_biometric_enabled';

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`
  );
}

function randomSalt(): string {
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function isLockEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(K_LOCK_ENABLED)) === 'true';
}

/**
 * Define (ou redefine) o PIN e ativa o bloqueio.
 */
export async function setPin(pin: string): Promise<void> {
  const salt = randomSalt();
  const hash = await hashPin(pin, salt);
  await SecureStore.setItemAsync(K_PIN_SALT, salt);
  await SecureStore.setItemAsync(K_PIN_HASH, hash);
  await SecureStore.setItemAsync(K_LOCK_ENABLED, 'true');
}

/**
 * Verifica o PIN informado contra o hash armazenado.
 */
export async function verifyPin(pin: string): Promise<boolean> {
  const salt = await SecureStore.getItemAsync(K_PIN_SALT);
  const storedHash = await SecureStore.getItemAsync(K_PIN_HASH);
  if (!salt || !storedHash) return false;
  const hash = await hashPin(pin, salt);
  return hash === storedHash;
}

/**
 * Desativa o bloqueio e remove PIN/biometria.
 */
export async function disableLock(): Promise<void> {
  await SecureStore.deleteItemAsync(K_PIN_HASH);
  await SecureStore.deleteItemAsync(K_PIN_SALT);
  await SecureStore.setItemAsync(K_LOCK_ENABLED, 'false');
  await SecureStore.setItemAsync(K_BIOMETRIC_ENABLED, 'false');
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(K_BIOMETRIC_ENABLED)) === 'true';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(K_BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
}

/**
 * Indica se o aparelho tem hardware biométrico configurado e utilizável.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

/**
 * Dispara o prompt de autenticação biométrica do sistema.
 */
export async function authenticateBiometric(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquear Nails',
      cancelLabel: 'Usar PIN',
      disableDeviceFallback: true,
    });
    return result.success;
  } catch {
    return false;
  }
}
