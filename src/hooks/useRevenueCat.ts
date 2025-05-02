import { useState, useEffect } from 'react';
import { Purchases, PurchasesOffering, CustomerInfo } from '@revenuecat/purchases-capacitor';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/useSession';

export type SubscriptionStatus = {
  isActive: boolean;
  expirationDate: Date | null;
  productId: string | null;
  offeringId: string | null;
};

export const useRevenueCat = () => {
  const [initialized, setInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [offerings, setOfferings] = useState<PurchasesOffering[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    isActive: false,
    expirationDate: null,
    productId: null,
    offeringId: null,
  });
  const { toast } = useToast();
  const { user } = useSession();

  // Initialize RevenueCat
  useEffect(() => {
    const initializeRevenueCat = async () => {
      if (initialized) return;
      
      try {
        setIsLoading(true);
        
        // Fetch API key from Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('revenuecat-config');
        
        if (error) {
          console.error('Error fetching RevenueCat config:', error);
          throw new Error('Failed to fetch RevenueCat configuration');
        }
        
        if (!data.publicKey) {
          throw new Error('RevenueCat API key not found');
        }
        
        // Initialize RevenueCat with the API key
        await Purchases.configure({ 
          apiKey: data.publicKey,
          appUserID: user?.id 
        });
        
        console.log('RevenueCat initialized with user ID:', user?.id);
        setInitialized(true);
        
        // Once initialized, fetch offerings and subscription status
        await Promise.all([fetchOfferings(), fetchSubscriptionStatus()]);
      } catch (error) {
        console.error('RevenueCat initialization error:', error);
        toast({
          variant: "destructive",
          title: "Subscription Service Error",
          description: "Could not initialize subscription service. Please try again later."
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Only initialize if we have a user
    if (user?.id) {
      initializeRevenueCat();
    } else {
      setIsLoading(false);
    }
  }, [user?.id, initialized, toast]);

  // Fetch available offerings
  const fetchOfferings = async () => {
    try {
      if (!initialized) return;
      
      console.log('Fetching RevenueCat offerings...');
      const offeringsData = await Purchases.getOfferings();
      
      console.log('Raw offerings data:', JSON.stringify(offeringsData, null, 2));
      
      if (offeringsData.current) {
        console.log('Current offering:', offeringsData.current);
        console.log('Available packages:', offeringsData.current.availablePackages);
      }
      
      if (offeringsData.all) {
        console.log('All offerings:', offeringsData.all);
        const offeringsArray = Object.values(offeringsData.all);
        setOfferings(offeringsArray);
        console.log('Processed offerings:', offeringsArray);
      } else {
        console.warn('No offerings available in RevenueCat dashboard');
        setOfferings([]);
      }
    } catch (error) {
      console.error('Error fetching offerings:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      toast({
        variant: "destructive",
        title: "Subscription Error",
        description: "Could not fetch subscription options. Please try again later."
      });
    }
  };

  // Fetch current subscription status
  const fetchSubscriptionStatus = async () => {
    try {
      if (!initialized) return;
      
      const { customerInfo } = await Purchases.getCustomerInfo();
      
      // Check if user has an active subscription
      const isPro = Boolean(customerInfo.entitlements.active?.["pro"]?.isActive);
      
      // Get the expiration date if available
      let expirationDate = null;
      let productId = null;
      let offeringId = null;
      
      if (isPro && customerInfo.activeSubscriptions && customerInfo.activeSubscriptions.length > 0) {
        const subId = customerInfo.activeSubscriptions[0];
        
        if (customerInfo.allExpirationDates && customerInfo.allExpirationDates[subId]) {
          expirationDate = new Date(customerInfo.allExpirationDates[subId] * 1000);
        }
        
        productId = subId;
        
        // Try to determine the offering ID
        if (customerInfo.allPurchasedProductIdentifiers) {
          for (const offering of Object.keys(customerInfo.allPurchasedProductIdentifiers)) {
            if (offering.includes('pro')) {
              offeringId = offering;
              break;
            }
          }
        }
      }
      
      setSubscription({
        isActive: isPro,
        expirationDate,
        productId,
        offeringId
      });
      
      console.log('Subscription status:', isPro ? 'Active' : 'Inactive');
      
      return { isActive: isPro, expirationDate, productId, offeringId };
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      toast({
        variant: "destructive", 
        title: "Subscription Status Error",
        description: "Could not verify your subscription status. Please try again later."
      });
      return subscription;
    }
  };

  // Purchase a product
  const purchaseProduct = async (productId: string) => {
    try {
      if (!initialized) {
        // We need to initialize first
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({
            variant: "destructive",
            title: "Authentication Required",
            description: "Please sign in before purchasing."
          });
          return false;
        }
        
        setIsLoading(true);
        
        // Fetch API key from Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('revenuecat-config');
        
        if (error || !data.publicKey) {
          toast({
            variant: "destructive",
            title: "Service Unavailable",
            description: "Could not connect to subscription service. Please try again later."
          });
          return false;
        }
        
        // Initialize RevenueCat with the API key
        await Purchases.configure({ 
          apiKey: data.publicKey,
          appUserID: user.id 
        });
        
        console.log('RevenueCat initialized with user ID:', user.id);
        setInitialized(true);
      }
      
      setIsLoading(true);
      const result = await Purchases.purchaseStoreProduct(productId);
      
      if (result) {
        // Check if purchase was successful and entitlement is active
        const isProActive = result.customerInfo.entitlements.active && 
                           result.customerInfo.entitlements.active["pro"] || false;
        
        if (isProActive) {
          toast({
            variant: "success",
            title: "Upgrade Successful",
            description: "You've successfully upgraded to Pro!"
          });
          
          // Update subscription status
          await fetchSubscriptionStatus();
          return true;
        } else {
          toast({
            variant: "destructive",
            title: "Upgrade Failed",
            description: "Your purchase was processed, but Pro access could not be activated. Please contact support."
          });
        }
      }
      
      return false;
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        variant: "destructive",
        title: "Purchase Failed",
        description: "There was an error processing your purchase. Please try again later."
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Restore purchases
  const restorePurchases = async () => {
    try {
      if (!initialized) {
        // We need to initialize first
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({
            variant: "destructive",
            title: "Authentication Required",
            description: "Please sign in before restoring purchases."
          });
          return false;
        }
        
        setIsLoading(true);
        
        // Fetch API key from Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('revenuecat-config');
        
        if (error || !data.publicKey) {
          toast({
            variant: "destructive",
            title: "Service Unavailable",
            description: "Could not connect to subscription service. Please try again later."
          });
          return false;
        }
        
        // Initialize RevenueCat with the API key
        await Purchases.configure({ 
          apiKey: data.publicKey,
          appUserID: user.id 
        });
        
        console.log('RevenueCat initialized with user ID:', user.id);
        setInitialized(true);
      }
      
      setIsLoading(true);
      await Purchases.restorePurchases();
      
      // Check status after restore
      const status = await fetchSubscriptionStatus();
      
      if (status.isActive) {
        toast({
          variant: "success",
          title: "Purchases Restored",
          description: "Your Pro subscription has been restored successfully!"
        });
        return true;
      } else {
        toast({
          variant: "default",
          title: "No Purchases Found",
          description: "We couldn't find any previous Pro subscriptions to restore."
        });
        return false;
      }
    } catch (error) {
      console.error('Restore purchases error:', error);
      toast({
        variant: "destructive",
        title: "Restore Failed",
        description: "Could not restore your previous purchases. Please try again later."
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    subscription,
    offerings,
    initialized,
    fetchOfferings,
    fetchSubscriptionStatus,
    purchaseProduct,
    restorePurchases
  };
};
