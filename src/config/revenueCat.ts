
export const REVENUECAT_CONFIG = {
  ENTITLEMENT_IDENTIFIER: 'pro',
  OFFERING_ID: 'ofrng4657c81eae',
  products: {
    weekly: 'og_499_1w', // Weekly $4.99
    monthly: 'og_999_1m', // Monthly $9.99
  },
  pricing: {
    weekly: 4.99,
    monthly: 9.99,
  },
  trials: {
    weekly: {
      hasTrial: true,
      trialDays: 3,
      trialText: "3-day free trial, then $4.99/week"
    },
    monthly: {
      hasTrial: false,
      trialDays: 0,
      trialText: "$9.99/month"
    }
  },
  developmentMode: {
    enabled: process.env.NODE_ENV === 'development',
    mockSubscription: false, // Disable mock to use real RevenueCat
  }
};
