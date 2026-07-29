// ============================================
// CONTEXTO DE CONTA E SINCRONIZAÇÃO
// Login por telefone (OTP) e estado da sincronização com a nuvem.
// Funciona sobre a seam de adaptadores: enquanto nenhum provedor estiver
// conectado, `configured` é false e o app segue 100% offline.
// ============================================

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { getAuthAdapter, isSyncConfigured } from '../sync/adapters';
import { runSync, enableSyncAndSeed, disableSync } from '../sync/syncService';
import { getPendingCount, isSyncEnabled } from '../sync/outbox';
import type { AccountSession } from '../sync/types';

interface ActionResult {
  success: boolean;
  message: string;
}

interface AccountContextType {
  configured: boolean;
  session: AccountSession | null;
  syncEnabled: boolean;
  pendingCount: number;
  loading: boolean;
  syncing: boolean;
  requestOtp: (phone: string) => Promise<ActionResult>;
  verifyOtp: (phone: string, code: string) => Promise<ActionResult>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<ActionResult>;
  refresh: () => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [configured] = useState(() => isSyncConfigured());
  const [session, setSession] = useState<AccountSession | null>(null);
  const [syncEnabled, setSyncEnabledState] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(() => {
    setSyncEnabledState(isSyncEnabled());
    setPendingCount(getPendingCount());
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        if (isSyncConfigured()) {
          const existing = await getAuthAdapter().getSession();
          setSession(existing);
        }
      } catch (err) {
        console.error('Erro ao carregar sessão:', err);
      } finally {
        refresh();
        setLoading(false);
      }
    };
    init();
  }, [refresh]);

  const requestOtp = useCallback(async (phone: string): Promise<ActionResult> => {
    try {
      await getAuthAdapter().requestOtp(phone);
      return { success: true, message: 'Código enviado por SMS' };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Erro ao enviar código',
      };
    }
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string): Promise<ActionResult> => {
    try {
      const newSession = await getAuthAdapter().verifyOtp(phone, code);
      setSession(newSession);

      // Primeiro login: ativa a sincronização e semeia a nuvem com os dados locais.
      enableSyncAndSeed();
      refresh();

      // Dispara um ciclo de sync (não bloqueia o retorno em caso de falha de rede).
      runSync().catch(err => console.error('Sync inicial falhou:', err));

      return { success: true, message: 'Conta conectada!' };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Código inválido',
      };
    }
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await getAuthAdapter().signOut();
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
    disableSync();
    setSession(null);
    refresh();
  }, [refresh]);

  const syncNow = useCallback(async (): Promise<ActionResult> => {
    setSyncing(true);
    try {
      const result = await runSync();
      refresh();
      if (result.skipped) {
        return { success: false, message: 'Sincronização indisponível no momento' };
      }
      return {
        success: true,
        message: `Sincronizado (${result.pushed ?? 0} enviados, ${result.pulled ?? 0} recebidos)`,
      };
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
      return { success: false, message: 'Erro ao sincronizar' };
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  return (
    <AccountContext.Provider
      value={{
        configured,
        session,
        syncEnabled,
        pendingCount,
        loading,
        syncing,
        requestOtp,
        verifyOtp,
        signOut,
        syncNow,
        refresh,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
};

export const useAccount = (): AccountContextType => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
};
