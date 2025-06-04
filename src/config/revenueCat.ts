import { Capacitor } from '@capacitor/core';

export const REVENUECAT_CONFIG = {
  // Remove exposed API key - this will now be handled server-side
  apiKey: '', // Empty - API operations should go through Supabase Edge Functions
  API_KEY: '', // Keep for backward compatibility but empty
  
  // Keep platform detection for client-side SDK initialization if needed
  get platform() {
    return Capacitor.getPlatform();
  },
  
  // Product identifiers remain client-side as they're not sensitive
  products: {
    monthly: 'monthly_pro',
    yearly: 'yearly_pro'
  },
  
  // Add the missing entitlement identifier
  ENTITLEMENT_IDENTIFIER: 'pro'
};

// Note: All RevenueCat API operations should now go through secure backend endpoints
// using the API key stored in Supabase secrets
