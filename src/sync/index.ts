// ============================================
// API PÚBLICA DO MÓDULO DE SINCRONIZAÇÃO
// ============================================

export type {
  SyncEntity,
  SyncOp,
  ChangeRecord,
  RemoteRecord,
  PullResult,
  RemoteAdapter,
  AuthAdapter,
  AccountSession,
  SyncResult,
} from './types';

export { recordChange, getPendingCount, isSyncEnabled } from './outbox';
export {
  registerRemoteAdapter,
  registerAuthAdapter,
  getRemoteAdapter,
  getAuthAdapter,
  isSyncConfigured,
} from './adapters';
export { runSync, applyRemoteChanges, enableSyncAndSeed, disableSync } from './syncService';
export { remoteWins } from './mergeLWW';
