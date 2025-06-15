
import { useState, useEffect, useCallback } from 'react';
import { Purchases, PurchasesOffering, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/useSession';
import { REVENUECAT_CONFIG } from '@/config/revenueCat';

export type SubscriptionStatus = {
  isActive: boolean;
  expirationDate: Date | null;
  productId: string | null;
  offeringId: string | null;
};

let isRevenueCatInitialized = false;
let initializationPromise: Promise<void> | null = null;

export const useRevenueCatManager = () => {
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

  const debugLog = useCallback((message: string, data?: any) => {
    console.log(`🚀 RevenueCat Manager: ${message}`, data || '');
  }, []);

  // Initialize RevenueCat with API key from Supabase
  const initializeRevenueCat = useCallback(async () => {
    if (isRevenueCatInitialized || initializationPromise) {
      debugLog('RevenueCat already initialized');
      return initializationPromise;
    }

    initializationPromise = (async () => {
      try {
        debugLog('Starting RevenueCat initialization...');
        
        // Skip on web platform - use development mode
        if (!Capacitor.isNativePlatform()) {
          debugLog('Web platform detected - using development mode');
          setSubscription({
            isActive: false, // For paywall testing
            expirationDate: null,
            productId: 'web-dev',
            offeringId: 'web-dev'
          });
          setIsLoading(false);
          return;
        }

        // Fetch API key from Supabase Edge Function
        debugLog('Fetching RevenueCat config from Supabase...');
        const { data, error } = await supabase.functions.invoke('revenuecat-config');
        
        if (error) {
          throw new Error(`Failed to fetch RevenueCat config: ${error.message}`);
        }

        if (!data?.publicKey || data.developmentMode) {
          debugLog('API key not available - using development mode');
          setSubscription({
            isActive: false,
            expirationDate: null,
            productId: 'dev-mode',
            offeringId: 'dev-mode'
          });
          setIsLoading(false);
          return;
        }

        debugLog('API key received, configuring RevenueCat...', {
          keyPrefix: data.publicKey.substring(0, 8) + '...'
        });
        
        // Configure RevenueCat with the API key
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        await Purchases.configure({
          apiKey: data.publicKey,
          appUserID: user?.id || null
        });

        debugLog('RevenueCat configured successfully');
        isRevenueCatInitialized = true;

        // Fetch initial data
        await Promise.all([
          fetchOfferings(),
          fetchSubscriptionStatus()
        ]);

      } catch (error) {
        debugLog('RevenueCat initialization failed', error);
        
        // Fallback to development mode
        setSubscription({
          isActive: false,
          expirationDate: null,
          productId: 'fallback',
          offeringId: 'fallback'
        });
        
        toast({
          variant: "destructive",
          title: "Subscription Service Unavailable",
          description: "Running in development mode. Check your connection and try again."
        });
      } finally {
        setIsLoading(false);
      }
    })();

    return initializationPromise;
  }, [user?.id, debugLog, toast]);

  // Fetch offerings from RevenueCat
  const fetchOfferings = useCallback(async () => {
    try {
      if (!isRevenueCatInitialized || !Capacitor.isNativePlatform()) {
        debugLog('Skipping offerings fetch - not initialized or not native');
        return;
      }

      debugLog('Fetching offerings...');
      const offeringsData = await Purchases.getOfferings();
      
      debugLog('Offerings received:', {
        current: offeringsData.current?.identifier,
        allCount: Object.keys(offeringsData.all || {}).length
      });

      if (offeringsData.current) {
        const packages = offeringsData.current.availablePackages || [];
        debugLog('Available packages:', packages.map(pkg => ({
          identifier: pkg.identifier,
          productId: pkg.product.identifier,
          price: pkg.product.priceString
        })));

        // Verify our target product exists
        const hasTargetProduct = packages.some(
          pkg => pkg.product.identifier === REVENUECAT_CONFIG.products.monthly
        );
        debugLog(`Target product '${REVENUECAT_CONFIG.products.monthly}' found: ${hasTargetProduct}`);
      }

      const allOfferings = Object.values(offeringsData.all || {});
      setOfferings(allOfferings);
      debugLog(`Successfully loaded ${allOfferings.length} offerings`);

    } catch (error) {
      debugLog('Failed to fetch offerings', error);
      toast({
        variant: "destructive",
        title: "Could not load subscription options",
        description: "Please check your connection and try again."
      });
    }
  }, [debugLog, toast]);

  // Fetch current subscription status
  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      if (!isRevenueCatInitialized || !Capacitor.isNativePlatform()) {
        debugLog('Skipping subscription status fetch');
        return subscription;
      }

      debugLog('Fetching customer info...');
      const { customerInfo } = await Purchases.getCustomerInfo();
      
      const isPro = Boolean(customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive);
      debugLog(`Subscription status: ${isPro ? 'Active' : 'Inactive'}`);

      if (isPro) {
        debugLog('Pro entitlements:', customerInfo.entitlements.active);
      }

      let expirationDate = null;
      let productId = null;
      let offeringId = null;

      if (isPro && customerInfo.activeSubscriptions?.length > 0) {
        const subId = customerInfo.activeSubscriptions[0];
        
        if (customerInfo.allExpirationDates?.[subId]) {
          expirationDate = new Date(customerInfo.allExpirationDates[subId] * 1000);
          debugLog('Subscription expires:', expirationDate);
        }
        
        productId = subId;
        offeringId = customerInfo.allPurchasedProductIdentifiers?.[0] || null;
      }

      const newStatus = {
        isActive: isPro,
        expirationDate,
        productId,
        offeringId
      };

      setSubscription(newStatus);
      return newStatus;

    } catch (error) {
      debugLog('Failed to fetch subscription status', error);
      return subscription;
    }
  }, [debugLog, subscription]);

  // Purchase a product by identifier
  const purchaseProduct = useCallback(async (productId: string) => {
    try {
      if (!Capacitor.isNativePlatform()) {
        toast({
          title: "Mobile App Required",
          description: "Subscriptions are only available in the mobile app."
        });
        return false;
      }

      if (!isRevenueCatInitialized) {
        throw new Error('RevenueCat not initialized');
      }

      debugLog(`Starting purchase for product: ${productId}`);
      setIsLoading(true);

      const result = await Purchases.purchaseStoreProduct({ 
        productIdentifier: productId 
      });
      
      const isProActive = result.customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive || false;
      
      if (isProActive) {
        debugLog('Purchase successful - Pro access activated');
        
        toast({
          title: "Welcome to Pro! 🎉",
          description: "Your subscription is now active. Enjoy all premium features!"
        });
        
        await fetchSubscriptionStatus();
        return true;
      } else {
        debugLog('Purchase completed but Pro access not activated');
        
        toast({
          variant: "destructive",
          title: "Subscription Issue",
          description: "Purchase processed but Pro access not activated. Contact support if this persists."
        });
        return false;
      }

    } catch (error: any) {
      debugLog('Purchase failed', error);
      
      if (error.message?.includes('cancelled')) {
        toast({
          title: "Purchase Cancelled",
          description: "You cancelled the purchase."
        });
      } else if (error.message?.includes('No active account')) {
        toast({
          variant: "destructive",
          title: "Apple ID Required",
          description: "Please sign in to your Apple ID in Settings to make purchases."
        });
      } else {
        toast({
          variant: "destructive",
          title: "Purchase Failed",
          description: "There was an error processing your purchase. Please try again."
        });
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [debugLog, toast, fetchSubscriptionStatus]);

  // Restore previous purchases
  const restorePurchases = useCallback(async () => {
    try {
      if (!Capacitor.isNativePlatform()) {
        toast({
          title: "Mobile App Required",
          description: "Restore purchases is only available in the mobile app."
        });
        return false;
      }

      if (!isRevenueCatInitialized) {
        throw new Error('RevenueCat not initialized');
      }

      debugLog('Starting purchase restoration...');
      setIsLoading(true);

      const { customerInfo } = await Purchases.restorePurchases();
      const isPro = Boolean(customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive);

      debugLog(`Restore completed - Pro status: ${isPro}`);

      if (isPro) {
        toast({
          title: "Purchases Restored! 🎉",
          description: "Your Pro subscription has been restored successfully."
        });
        
        await fetchSubscriptionStatus();
        return true;
      } else {
        toast({
          title: "No Purchases Found",
          description: "We couldn't find any previous Pro subscriptions for your account."
        });
        return false;
      }

    } catch (error) {
      debugLog('Restore failed', error);
      
      toast({
        variant: "destructive",
        title: "Restore Failed",
        description: "Could not restore purchases. Please try again later."
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [debugLog, toast, fetchSubscriptionStatus]);

  // Initialize when user is available
  useEffect(() => {
    if (user?.id) {
      debugLog('User authenticated, initializing RevenueCat...');
      initializeRevenueCat();
    } else {
      debugLog('No user, skipping RevenueCat initialization');
      setIsLoading(false);
    }
  }, [user?.id, initializeRevenueCat, debugLog]);

  return {
    isLoading,
    subscription,
    offerings,
    initialized: isRevenueCatInitialized,
    fetchOfferings,
    fetchSubscriptionStatus,
    purchaseProduct,
    restorePurchases
  };
};
