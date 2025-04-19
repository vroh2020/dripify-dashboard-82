
import { Purchases, PurchasesConfiguration } from '@revenuecat/purchases-capacitor';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

let isInitialized = false;
export const isCapacitorAvailable = typeof Purchases !== 'undefined';

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
    const { data, error } = await supabase.functions.invoke('revenuecat-config');
    
    if (error) throw new Error(`Failed to get RevenueCat config: ${error.message}`);
    if (!data?.publicKey) throw new Error('RevenueCat public key not found');
    
    const config: PurchasesConfiguration = {
      apiKey: data.publicKey,
      ...(userId && { appUserID: userId })
    };

    await Purchases.configure(config);
    isInitialized = true;
    console.log('RevenueCat initialized successfully');
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
    isInitialized = true;
    if (isCapacitorAvailable) {
      toast({
        title: "Error",
        description: "Failed to initialize payment system",
        variant: "destructive",
      });
    }
  }
}
