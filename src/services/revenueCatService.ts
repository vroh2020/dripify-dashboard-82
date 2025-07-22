import { Purchases, PurchasesPackage, CustomerInfo, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

let lastRevenueCatUserId: string | null = null;
let lastLogInTime: number = 0;
let throttleStats = {
  totalCalls: 0,
  throttledCalls: 0,
  executedCalls: 0
};

// Helper function to log throttling stats
const logThrottleStats = () => {
  if (throttleStats.totalCalls > 0) {
    const throttleRate = (throttleStats.throttledCalls / throttleStats.totalCalls * 100).toFixed(1);
    console.log(`📊 RevenueCat Throttle Stats: ${throttleStats.executedCalls} executed, ${throttleStats.throttledCalls} throttled (${throttleRate}% throttled)`);
  }
};

// Helper function to check if we should throttle
const shouldThrottleLogIn = (userId: string | null): boolean => {
  if (!userId) return true; // Don't log in if no user ID
  
  throttleStats.totalCalls++;
  const now = Date.now();
  
  if (lastRevenueCatUserId !== userId || now - lastLogInTime > 5000) {
    throttleStats.executedCalls++;
    return false; // Don't throttle
  } else {
    throttleStats.throttledCalls++;
    // Log stats every 10 throttled calls to monitor effectiveness
    if (throttleStats.throttledCalls % 10 === 0) {
      logThrottleStats();
    }
    return true; // Throttle this call
  }
};

export const initializeRevenueCat = async (userId: string | null) => {
  if (!Capacitor.isNativePlatform()) {
    console.log("Not on a native platform, skipping RevenueCat native initialization.");
    return;
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    
    // Fetch the API key from Supabase Edge Function
    const { data: config, error: configError } = await supabase.functions.invoke('revenuecat-config');
    if (configError || !config.revenueCatApiKey) {
      console.error('Failed to fetch RevenueCat API key:', configError);
      throw new Error("Could not retrieve RevenueCat API key.");
    }
    
    // No configuration here, just setup
    // await Purchases.configure({
    //   apiKey: config.revenueCatApiKey,
    // });

    if (userId) {
      if (!shouldThrottleLogIn(userId)) {
        lastRevenueCatUserId = userId;
        lastLogInTime = Date.now();
        await Purchases.logIn({ appUserID: userId });
        console.log('✅ RevenueCat: User logged in');
      } else {
        console.log('⏳ Skipping RevenueCat logIn to avoid rate limit');
      }
    }

  } catch (error: any) {
    console.error("Failed to initialize RevenueCat:", error);
    
    // Provide specific error messages based on error type
    if (error.message?.includes('network') || error.message?.includes('timeout')) {
      throw new Error("Network connection issue. Please check your internet and try again.");
    } else if (error.message?.includes('API key')) {
      throw new Error("Configuration error. Please restart the app and try again.");
    } else {
      throw new Error("Failed to initialize payment system. Please try again.");
    }
  }
};

export const getPurchaserInfo = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log("Not on a native platform, skipping RevenueCat native initialization.");
    return;
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('Failed to get customer info:', error);
    throw error;
  }
};

export const getOfferings = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log("Not on a native platform, skipping RevenueCat native initialization.");
    return;
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages || [];
  } catch (error) {
    console.error('Failed to get offerings:', error);
    throw error;
  }
};

export const purchasePackage = async (packageToPurchase: PurchasesPackage) => {
  if (!Capacitor.isNativePlatform()) {
    console.log("Not on a native platform, skipping RevenueCat native initialization.");
    return;
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.purchasePackage({ 
      offeringIdentifier: packageToPurchase.offeringIdentifier,
      packageIdentifier: packageToPurchase.identifier
    });
    return customerInfo;
  } catch (error) {
    console.error('Failed to purchase package:', error);
    throw error;
  }
};

export const restorePurchases = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log("Not on a native platform, skipping RevenueCat native initialization.");
    return;
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error('Failed to restore purchases:', error);
    throw error;
  }
};

export const identifyUser = async (userId: string) => {
  if (!Capacitor.isNativePlatform()) {
    console.log("Not on a native platform, skipping RevenueCat native initialization.");
    return;
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    
    if (!shouldThrottleLogIn(userId)) {
      lastRevenueCatUserId = userId;
      lastLogInTime = Date.now();
      await Purchases.logIn({ appUserID: userId });
      console.log('✅ RevenueCat: User identified');
    } else {
      console.log('⏳ Skipping RevenueCat logIn to avoid rate limit');
    }
  } catch (error: any) {
    console.error('Failed to identify user:', error);
    
    // Handle specific RevenueCat errors
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      throw new Error("Too many requests. Please wait a moment and try again.");
    } else if (error.message?.includes('network') || error.message?.includes('timeout')) {
      throw new Error("Network connection issue. Please check your internet and try again.");
    } else {
      throw new Error("Failed to identify user. Please try again.");
    }
  }
};

export const logout = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log("Not on a native platform, skipping RevenueCat native initialization.");
    return;
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    await Purchases.logOut();
  } catch (error) {
    console.error('Failed to logout:', error);
    throw error;
  }
}; 