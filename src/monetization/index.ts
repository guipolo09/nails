// ============================================
// API PÚBLICA DA MONETIZAÇÃO
// ============================================

import { registerPurchasesAdapter, getPurchasesAdapter } from './adapters';
import { revenueCatAdapter } from './revenuecatAdapter';

export type { PurchasesAdapter, PlanOption, PlanPeriod } from './types';
export { getPurchasesAdapter } from './adapters';
export {
  PRO_ENTITLEMENT_ID,
  FREE_CLIENT_LIMIT,
  PRO_FEATURE_LABELS,
  type ProFeature,
} from './config';

/**
 * Registra o adaptador RevenueCat se houver chave configurada.
 * Chame na inicialização do app. Sem chave, a monetização fica desligada.
 */
export function initMonetization(): void {
  if (revenueCatAdapter.isConfigured()) {
    registerPurchasesAdapter(revenueCatAdapter);
  }
}

export function isMonetizationConfigured(): boolean {
  return getPurchasesAdapter().isConfigured();
}
