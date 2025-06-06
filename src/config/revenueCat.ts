import { Capacitor } from '@capacitor/core';

export const REVENUECAT_CONFIG = {
  // Environment-based API key configuration
  get apiKey() {
    // For production, this should come from environment variables
    // For development, we'll use development mode fallback
    return import.meta.env?.VITE_REVENUECAT_PUBLIC_KEY || '';
  },
  
  // Keep platform detection for client-side SDK initialization
  get platform() {
    return Capacitor.getPlatform();
  },
  
  // Check if we're in development mode (no API key)
  get isDevelopmentMode() {
    return !this.apiKey || this.apiKey.trim() === '';
  },
  
  // Product identifiers remain client-side as they're not sensitive
  products: {
    monthly: 'monthly_pro',
    yearly: 'yearly_pro'
  },
  
  // Add the missing entitlement identifier
  ENTITLEMENT_IDENTIFIER: 'pro',
  
  // Development mode settings
  development: {
    // Grant access in development mode for testing
    simulateProAccess: true,
    // Log development mode status
    logEnabled: true
  }
};

// Note: All RevenueCat API operations should now go through secure backend endpoints
// using the API key stored in Supabase secrets
