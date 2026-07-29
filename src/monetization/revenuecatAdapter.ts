// ============================================
// ADAPTADOR REVENUECAT
// Só é usado quando há chave pública configurada para a plataforma.
// Traduz o contrato PurchasesAdapter para o SDK react-native-purchases.
// ============================================

import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import type { PurchasesAdapter, PlanOption, PlanPeriod } from './types';
import {
  REVENUECAT_API_KEY_ANDROID,
  REVENUECAT_API_KEY_IOS,
  PRO_ENTITLEMENT_ID,
} from './config';

function apiKeyForPlatform(): string {
  return Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
}

function hasPro(info: CustomerInfo): boolean {
  return info.entitlements.active[PRO_ENTITLEMENT_ID] != null;
}

function periodFromPackageType(packageType: string): PlanPeriod {
  if (packageType === 'ANNUAL') return 'annual';
  if (packageType === 'MONTHLY') return 'monthly';
  return 'other';
}

class RevenueCatAdapter implements PurchasesAdapter {
  private initialized = false;

  isConfigured(): boolean {
    return apiKeyForPlatform().length > 0;
  }

  async init(): Promise<void> {
    if (this.initialized || !this.isConfigured()) return;
    if (__DEV__) {
      await Purchases.setLogLevel(LOG_LEVEL.WARN);
    }
    Purchases.configure({ apiKey: apiKeyForPlatform() });
    this.initialized = true;
  }

  async getIsPro(): Promise<boolean> {
    const info = await Purchases.getCustomerInfo();
    return hasPro(info);
  }

  async getPlans(): Promise<PlanOption[]> {
    const offerings = await Purchases.getOfferings();
    const packages = offerings.current?.availablePackages ?? [];
    return packages.map((pkg: PurchasesPackage) => ({
      id: pkg.identifier,
      title: pkg.product.title,
      priceString: pkg.product.priceString,
      period: periodFromPackageType(pkg.packageType),
      raw: pkg,
    }));
  }

  async purchase(plan: PlanOption): Promise<boolean> {
    try {
      const result = await Purchases.purchasePackage(plan.raw as PurchasesPackage);
      return hasPro(result.customerInfo);
    } catch (err) {
      // Cancelamento do usuário não é erro real
      if (err && typeof err === 'object' && 'userCancelled' in err && err.userCancelled) {
        return false;
      }
      throw err;
    }
  }

  async restore(): Promise<boolean> {
    const info = await Purchases.restorePurchases();
    return hasPro(info);
  }
}

export const revenueCatAdapter = new RevenueCatAdapter();
