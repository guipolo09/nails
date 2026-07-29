// ============================================
// REGISTRO DO ADAPTADOR DE COMPRAS
// Por padrão "não configurado" (monetização desligada → tudo liberado).
// O revenuecatAdapter se auto-registra quando há chave (ver ./index).
// ============================================

import type { PurchasesAdapter, PlanOption } from './types';

class NotConfiguredPurchasesAdapter implements PurchasesAdapter {
  isConfigured(): boolean {
    return false;
  }
  async init(): Promise<void> {
    /* no-op */
  }
  async getIsPro(): Promise<boolean> {
    return false;
  }
  async getPlans(): Promise<PlanOption[]> {
    return [];
  }
  async purchase(): Promise<boolean> {
    return false;
  }
  async restore(): Promise<boolean> {
    return false;
  }
}

let adapter: PurchasesAdapter = new NotConfiguredPurchasesAdapter();

export function registerPurchasesAdapter(a: PurchasesAdapter): void {
  adapter = a;
}

export function getPurchasesAdapter(): PurchasesAdapter {
  return adapter;
}
