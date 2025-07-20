
export const REVENUECAT_CONFIG = {
  ENTITLEMENT_IDENTIFIER: 'pro',
  products: {
    weekly: 'gs_499_1w',   // Weekly subscription at $4.99
    monthly: 'gs_1099_1m', // Monthly subscription at $10.99
  },
  developmentMode: {
    enabled: process.env.NODE_ENV === 'development',
    mockSubscription: false, // Disable mock to use real RevenueCat
  }
};
