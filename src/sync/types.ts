// ============================================
// TIPOS DE SINCRONIZAÇÃO (agnóstico de provedor)
// A seam entre o app e a nuvem: implemente um RemoteAdapter/AuthAdapter para
// Supabase, API própria, etc., sem tocar no resto do app.
// ============================================

/** Entidades sincronizáveis (tabelas locais planas). */
export type SyncEntity =
  | 'clients'
  | 'services'
  | 'professionals'
  | 'appointments'
  | 'packages'
  | 'package_slots';

export type SyncOp = 'upsert' | 'delete';

/** Uma mudança local pendente de envio (linha do outbox). */
export interface ChangeRecord {
  id: number;
  entity: SyncEntity;
  entityId: string;
  op: SyncOp;
  payload: Record<string, unknown> | null; // linha completa em upsert; null em delete
  updatedAt: string; // ISO
}

/** Uma mudança vinda da nuvem para aplicar localmente. */
export interface RemoteRecord {
  entity: SyncEntity;
  entityId: string;
  deleted: boolean;
  payload: Record<string, unknown> | null;
  updatedAt: string; // ISO
}

export interface PullResult {
  changes: RemoteRecord[];
  cursor: string; // novo cursor (ex.: timestamp do servidor) para o próximo pull
}

/**
 * Contrato de transporte com a nuvem. Uma implementação concreta (ex.: Supabase)
 * traduz ChangeRecord/RemoteRecord para o backend escolhido.
 */
export interface RemoteAdapter {
  /** Se há credenciais/config para operar. */
  isConfigured(): boolean;
  /** Envia mudanças locais. Deve ser idempotente (upsert por id). */
  push(changes: ChangeRecord[]): Promise<void>;
  /** Busca mudanças remotas desde o cursor (null = tudo). */
  pull(since: string | null): Promise<PullResult>;
}

/** Sessão de conta autenticada. */
export interface AccountSession {
  userId: string;
  phone: string;
}

/**
 * Contrato de autenticação por telefone (OTP). Uma implementação concreta
 * (ex.: Supabase Auth) realiza o envio/verificação do código.
 */
export interface AuthAdapter {
  isConfigured(): boolean;
  getSession(): Promise<AccountSession | null>;
  /** Solicita o envio do código OTP para o telefone (formato E.164, ex.: +5511999999999). */
  requestOtp(phone: string): Promise<void>;
  /** Verifica o código e retorna a sessão. */
  verifyOtp(phone: string, code: string): Promise<AccountSession>;
  signOut(): Promise<void>;
}

export interface SyncResult {
  skipped: boolean;
  reason?: string;
  pushed?: number;
  pulled?: number;
}
