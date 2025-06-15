
import { Capacitor } from '@capacitor/core';

export const REVENUECAT_CONFIG = {
  // The API key will now come from Supabase Edge Function
  get isDevelopmentMode() {
    // In development, we'll check if we're on web or if API fails
    return !Capacitor.isNativePlatform();
  },
  
  // Product identifiers - matches your App Store Connect setup
  products: {
    monthly: 'gs_1299_1m', // Your monthly subscription product
    yearly: 'yearly_pro'   // Add yearly if you have it configured
  },
  
  // Entitlement identifier for Pro access
  ENTITLEMENT_IDENTIFIER: 'pro',
  
  // Bundle ID - let's standardize on one
  bundleId: 'com.genstyle.app', // Using this consistently
  
  // Platform detection
  get platform() {
    return Capacitor.getPlatform();
  },
  
  // Debug helper
  get isNative() {
    return Capacitor.isNativePlatform();
  }
};

// Debug helper for troubleshooting
export const debugRevenueCat = () => {
  console.log('🍎 RevenueCat Debug Info:');
  console.log('Platform:', Capacitor.getPlatform());
  console.log('Is Native:', Capacitor.isNativePlatform());
  console.log('Development Mode:', REVENUECAT_CONFIG.isDevelopmentMode);
  console.log('Product IDs:', REVENUECAT_CONFIG.products);
  console.log('Bundle ID:', REVENUECAT_CONFIG.bundleId);
  console.log('Entitlement ID:', REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER);
};
