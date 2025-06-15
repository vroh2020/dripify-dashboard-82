
export const REVENUECAT_CONFIG = {
  ENTITLEMENT_IDENTIFIER: 'pro',
  products: {
    monthly: 'dripmax_pro_monthly',
  },
  developmentMode: {
    enabled: process.env.NODE_ENV === 'development',
    mockSubscription: true,
  }
};
