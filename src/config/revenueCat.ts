
export const REVENUECAT_CONFIG = {
  ENTITLEMENT_IDENTIFIER: 'pro',
  products: {
    monthly: 'gs_1099_1m', // This matches your working StoreKit configuration ($10.99)
  },
  developmentMode: {
    enabled: process.env.NODE_ENV === 'development',
    mockSubscription: false, // Disable mock to use real RevenueCat
  }
};
