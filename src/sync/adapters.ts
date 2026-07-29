// ============================================
// REGISTRO DE ADAPTADORES DE SINCRONIZAÇÃO
// Por padrão, adaptadores "não configurados" (o app funciona 100% offline).
// Ao conectar um provedor (ex.: Supabase), chame registerRemoteAdapter/
// registerAuthAdapter na inicialização — nada mais no app precisa mudar.
// ============================================

import type {
  RemoteAdapter,
  AuthAdapter,
  PullResult,
  AccountSession,
} from './types';

class NotConfiguredRemoteAdapter implements RemoteAdapter {
  isConfigured(): boolean {
    return false;
  }
  async push(): Promise<void> {
    /* no-op */
  }
  async pull(): Promise<PullResult> {
    return { changes: [], cursor: '' };
  }
}

class NotConfiguredAuthAdapter implements AuthAdapter {
  isConfigured(): boolean {
    return false;
  }
  async getSession(): Promise<AccountSession | null> {
    return null;
  }
  async requestOtp(): Promise<void> {
    throw new Error('Sincronização não configurada');
  }
  async verifyOtp(): Promise<AccountSession> {
    throw new Error('Sincronização não configurada');
  }
  async signOut(): Promise<void> {
    /* no-op */
  }
}

let remoteAdapter: RemoteAdapter = new NotConfiguredRemoteAdapter();
let authAdapter: AuthAdapter = new NotConfiguredAuthAdapter();

export function registerRemoteAdapter(adapter: RemoteAdapter): void {
  remoteAdapter = adapter;
}

export function registerAuthAdapter(adapter: AuthAdapter): void {
  authAdapter = adapter;
}

export function getRemoteAdapter(): RemoteAdapter {
  return remoteAdapter;
}

export function getAuthAdapter(): AuthAdapter {
  return authAdapter;
}

export function isSyncConfigured(): boolean {
  return remoteAdapter.isConfigured() && authAdapter.isConfigured();
}
