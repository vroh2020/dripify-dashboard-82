import { Purchases, PurchasesPackage, CustomerInfo, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

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
      await Purchases.logIn({ appUserID: userId });
      console.log('✅ RevenueCat: User logged in');
    }

  } catch (error) {
    console.error("Failed to initialize RevenueCat:", error);
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
    // FIXED: Pass the actual package object, not identifiers
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
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
    await Purchases.logIn({ appUserID: userId });
  } catch (error) {
    console.error('Failed to identify user:', error);
    throw error;
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