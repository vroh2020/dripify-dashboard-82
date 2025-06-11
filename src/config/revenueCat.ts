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
  
  // Product identifiers - UPDATED to match App Store Connect
  products: {
    monthly: 'gs_1299_1m', // This matches your App Store Connect product ID
    yearly: 'yearly_pro'    // Add yearly if you have it configured
  },
  
  // Add the missing entitlement identifier
  ENTITLEMENT_IDENTIFIER: 'pro',
  
  // Development mode settings
  development: {
    // Grant access in development mode for testing
    simulateProAccess: true,
    // Log development mode status
    logEnabled: true
  },
  
  // Bundle ID verification
  bundleId: 'com.genstyle.app',
  
  // RevenueCat project configuration
  project: {
    // Add your RevenueCat project ID if known
    id: 'your-revenuecat-project-id'
  }
};

// Debug helper for iOS simulator issues
export const debugRevenueCat = () => {
  console.log('🍎 RevenueCat Debug Info:');
  console.log('Platform:', Capacitor.getPlatform());
  console.log('Native Platform:', Capacitor.isNativePlatform());
  console.log('API Key Available:', !!REVENUECAT_CONFIG.apiKey);
  console.log('Development Mode:', REVENUECAT_CONFIG.isDevelopmentMode);
  console.log('Product IDs:', REVENUECAT_CONFIG.products);
  console.log('Bundle ID:', REVENUECAT_CONFIG.bundleId);
};

// Note: All RevenueCat API operations should now go through secure backend endpoints
// using the API key stored in Supabase secrets
