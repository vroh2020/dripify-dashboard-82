export const REVENUECAT_CONFIG = {
  ENTITLEMENT_IDENTIFIER: 'pro',
  products: {
    monthly: 'gs_1299_1m', // This matches your StoreKit configuration
    weekly: 'gs_499_1w',   // Weekly Premium plan
  },
  developmentMode: {
    enabled: process.env.NODE_ENV === 'development',
    mockSubscription: false, // Disable mock to use real RevenueCat
  }
};
