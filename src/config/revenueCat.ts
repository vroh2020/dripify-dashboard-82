
export const REVENUECAT_CONFIG = {
  ENTITLEMENT_IDENTIFIER: 'pro',
  offering: {
    identifier: 'offering_1',  // Your RevenueCat offering ID
  },
  packages: {
    weekly: '$rc_weekly',     // Package ID from RevenueCat dashboard
    monthly: '$rc_monthly',   // Package ID from RevenueCat dashboard
  },
  products: {
    weekly: 'gs_499_1w',     // Actual product IDs for reference
    monthly: 'gs_1099_1m',   // Actual product IDs for reference
  },
  developmentMode: {
    enabled: process.env.NODE_ENV === 'development',
    mockSubscription: false,
  }
};
