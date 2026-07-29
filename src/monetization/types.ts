// ============================================
// TIPOS DE MONETIZAÇÃO (agnóstico de provedor)
// A seam entre o app e a loja/RevenueCat. Uma implementação concreta
// (RevenueCat) preenche o contrato; o resto do app só consulta `isPro`.
// ============================================

export type PlanPeriod = 'monthly' | 'annual' | 'other';

export interface PlanOption {
  id: string;
  title: string;
  priceString: string; // já formatado pela loja (ex.: "R$ 19,90")
  period: PlanPeriod;
  raw: unknown; // referência opaca ao pacote do provedor (ex.: PurchasesPackage)
}

export interface PurchasesAdapter {
  /** Há chave/config para operar a cobrança. */
  isConfigured(): boolean;
  /** Inicializa o SDK (idempotente). */
  init(): Promise<void>;
  /** O usuário tem o direito PRO ativo? */
  getIsPro(): Promise<boolean>;
  /** Planos disponíveis para compra (mensal/anual). */
  getPlans(): Promise<PlanOption[]>;
  /** Compra um plano; retorna se o PRO ficou ativo. */
  purchase(plan: PlanOption): Promise<boolean>;
  /** Restaura compras anteriores; retorna se o PRO ficou ativo. */
  restore(): Promise<boolean>;
}
