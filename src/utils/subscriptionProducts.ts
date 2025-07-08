import { Capacitor } from '@capacitor/core';
import { PurchasesOffering } from '@revenuecat/purchases-capacitor';
import { REVENUECAT_CONFIG } from '@/config/revenueCat';

export const HARDCODED_PRODUCTS = {
  [REVENUECAT_CONFIG.products.monthly]: {
    identifier: REVENUECAT_CONFIG.products.monthly,
    title: 'Monthly Premium',
    description: 'Monthly plan with 7-day free trial',
    price: 12.99,
    priceString: '$12.99',
    currencyCode: 'USD',
    subscriptionPeriod: 'P1M',
  },
  [REVENUECAT_CONFIG.products.weekly]: {
    identifier: REVENUECAT_CONFIG.products.weekly,
    title: 'Weekly Premium',
    description: 'Weekly plan for quick access',
    price: 4.99,
    priceString: '$4.99',
    currencyCode: 'USD',
    subscriptionPeriod: 'P1W',
  },
} as const;

export type HardcodedSku = keyof typeof HARDCODED_PRODUCTS;
export type HardcodedProduct = (typeof HARDCODED_PRODUCTS)[HardcodedSku];

/**
 * Attempt to find the product inside the loaded RevenueCat offerings; if that fails
 * return a hard-coded fallback on web. On native we must wait for the real store
 * product, so we return undefined to signal “still loading”.
 */
export function findProduct(
  offerings: PurchasesOffering[] | undefined,
  sku: HardcodedSku
) {
  // Search every package inside every offering for the matching identifier
  const storeProduct = offerings
    ?.flatMap((o) => o.availablePackages)
    .find((p) => p.product.identifier === sku)?.product;

  if (storeProduct) {
    return storeProduct;
  }

  // Only fall back to stub products when running on the web – purchases are
  // simulated there, so we don’t need the real StoreKit metadata.
  if (Capacitor.isNativePlatform()) {
    return undefined;
  }

  return HARDCODED_PRODUCTS[sku];
} 