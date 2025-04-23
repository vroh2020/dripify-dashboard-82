
import { Purchases, PurchasesConfiguration } from '@revenuecat/purchases-capacitor';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

let isInitialized = false;

// Better detection of Capacitor environment
export const isCapacitorAvailable = typeof Purchases !== 'undefined' && typeof window !== 'undefined' && 
  (window.hasOwnProperty('Capacitor') || 
   window.hasOwnProperty('cordova'));

export function isRevenueCatAvailable(): boolean {
  return isCapacitorAvailable;
}

export async function initializePurchases(userId?: string): Promise<void> {
  if (isInitialized) {
    console.log('RevenueCat already initialized');
    return;
  }

  if (!isCapacitorAvailable) {
    console.log('RevenueCat Capacitor plugin not available - web mode enabled');
    isInitialized = true;
    return;
  }

  try {
    console.log('Fetching RevenueCat config from Supabase function...');
    const { data, error } = await supabase.functions.invoke('revenuecat-config');
    
    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(`Failed to get RevenueCat config: ${error.message}`);
    }
    
    if (!data?.publicKey) {
      console.error('Invalid config data:', data);
      throw new Error('RevenueCat public key not found');
    }
    
    console.log('Initializing RevenueCat with configuration...');
    console.log(`Using RevenueCat public key: ${data.publicKey.substring(0, 5)}...`);
    
    const config: PurchasesConfiguration = {
      apiKey: data.publicKey,
      // Remove debugLogsEnabled as it's not in the type definition
      ...(userId && { appUserID: userId })
    };

    console.log('RevenueCat configuration:', JSON.stringify(config, (k, v) => k === 'apiKey' ? '[REDACTED]' : v));
    
    await Purchases.configure(config);
    console.log('RevenueCat initialized successfully on mobile device');
    
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      console.log('Customer info fetched successfully:', 
        customerInfo ? JSON.stringify({
          originalAppUserId: customerInfo.originalAppUserId,
          activeEntitlements: Object.keys(customerInfo.entitlements?.active || {}),
          allExpirationDates: customerInfo.allExpirationDates ? 'Present' : 'Not present'
        }) : 'No customer info available');
    } catch (customerError) {
      console.error('Unable to fetch customer info after initialization:', customerError);
    }
    
    isInitialized = true;
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
    isInitialized = true; // Prevent repeated initialization attempts
    if (isCapacitorAvailable) {
      toast({
        title: "RevenueCat Configuration",
        description: "Please check RevenueCat setup in Supabase and device configuration",
        variant: "destructive",
      });
    }
  }
}
