
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
    // Fetch the API key from Supabase
    const { data, error } = await supabase.functions.invoke('revenuecat-config');
    
    if (error) throw new Error(`Failed to get RevenueCat config: ${error.message}`);
    if (!data?.publicKey) throw new Error('RevenueCat public key not found');
    
    console.log('Initializing RevenueCat with configuration...');
    
    // Debug output - this will help troubleshoot key problems
    console.log(`Using RevenueCat public key: ${data.publicKey.substring(0, 5)}...`);
    
    // Configure RevenueCat with the API key
    const config: PurchasesConfiguration = {
      apiKey: data.publicKey,
      observerMode: false, // Force observerMode off to ensure purchases work
      ...(userId && { appUserID: userId })
    };

    await Purchases.configure(config);
    console.log('RevenueCat initialized successfully on mobile device');
    
    // Try to fetch customer info (important for validating setup)
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      console.log('Customer info fetched successfully:', 
        customerInfo ? 'Valid customer info object' : 'No customer info available');
    } catch (customerError) {
      console.warn('Unable to fetch customer info after initialization:', customerError);
    }
    
    isInitialized = true;
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
    isInitialized = true; // Prevent repeated initialization attempts
    if (isCapacitorAvailable) {
      toast({
        title: "RevenueCat Setup",
        description: "Please configure products in the RevenueCat dashboard",
        variant: "destructive",
      });
    }
  }
}
