
export const REVENUECAT_CONFIG = {
  ENTITLEMENT_IDENTIFIER: 'pro',
  OFFERING_ID: 'ofrng4657c81eae',
  products: {
    weekly: 'di_499_1w', // Weekly $4.99
    monthly: 'di_999_1m', // Monthly $9.99
  },
  pricing: {
    weekly: 4.99,
    monthly: 9.99,
  },
  developmentMode: {
    enabled: process.env.NODE_ENV === 'development',
    mockSubscription: false, // Disable mock to use real RevenueCat
  }
};
