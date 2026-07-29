// ============================================
// CONTEXTO DE DIREITOS (Free × PRO)
// Regra central: quando a monetização está DESLIGADA (sem RevenueCat
// configurado), `isPro` é true e nada trava. Quando LIGADA, `isPro` reflete
// a assinatura real do usuário.
// ============================================

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { getPurchasesAdapter } from '../monetization/adapters';
import { FREE_CLIENT_LIMIT } from '../monetization/config';
import type { PlanOption } from '../monetization/types';

interface EntitlementContextType {
  /** Se a cobrança está ativa (RevenueCat configurado). */
  monetizationActive: boolean;
  /** Acesso PRO efetivo (true quando a monetização está desligada). */
  isPro: boolean;
  /** Planos para o paywall. */
  plans: PlanOption[];
  loading: boolean;
  /** Limite de clientes do plano atual (null = ilimitado). */
  clientLimit: number | null;
  purchase: (plan: PlanOption) => Promise<{ success: boolean; message: string }>;
  restore: () => Promise<{ success: boolean; message: string }>;
  refresh: () => Promise<void>;
}

const EntitlementContext = createContext<EntitlementContextType | undefined>(undefined);

export const EntitlementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [monetizationActive] = useState(() => getPurchasesAdapter().isConfigured());
  const [isProReal, setIsProReal] = useState(false);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);

  const isPro = !monetizationActive || isProReal;

  const refresh = useCallback(async () => {
    const adapter = getPurchasesAdapter();
    if (!adapter.isConfigured()) {
      setLoading(false);
      return;
    }
    try {
      await adapter.init();
      const [pro, availablePlans] = await Promise.all([adapter.getIsPro(), adapter.getPlans()]);
      setIsProReal(pro);
      setPlans(availablePlans);
    } catch (err) {
      console.error('Erro ao carregar direitos/planos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const purchase = useCallback(async (plan: PlanOption) => {
    try {
      const pro = await getPurchasesAdapter().purchase(plan);
      setIsProReal(pro);
      return pro
        ? { success: true, message: 'Assinatura ativada. Bem-vinda ao PRO!' }
        : { success: false, message: 'Compra não concluída' };
    } catch (err) {
      console.error('Erro na compra:', err);
      return { success: false, message: 'Não foi possível concluir a compra' };
    }
  }, []);

  const restore = useCallback(async () => {
    try {
      const pro = await getPurchasesAdapter().restore();
      setIsProReal(pro);
      return pro
        ? { success: true, message: 'Assinatura restaurada!' }
        : { success: false, message: 'Nenhuma assinatura encontrada' };
    } catch (err) {
      console.error('Erro ao restaurar:', err);
      return { success: false, message: 'Não foi possível restaurar' };
    }
  }, []);

  const clientLimit = isPro ? null : FREE_CLIENT_LIMIT;

  return (
    <EntitlementContext.Provider
      value={{ monetizationActive, isPro, plans, loading, clientLimit, purchase, restore, refresh }}
    >
      {children}
    </EntitlementContext.Provider>
  );
};

export const useEntitlement = (): EntitlementContextType => {
  const context = useContext(EntitlementContext);
  if (context === undefined) {
    throw new Error('useEntitlement must be used within an EntitlementProvider');
  }
  return context;
};
