
import { useState, useEffect, useCallback } from 'react';
import { Purchases, PurchasesOffering, CustomerInfo, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/useSession';

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

  // Debug logging helper
  const debugLog = useCallback((message: string, data?: any) => {
    console.log(`🚀 RevenueCat Manager: ${message}`, data || '');
  }, []);

  // Initialize RevenueCat only once
  const initializeRevenueCat = useCallback(async () => {
    if (isRevenueCatInitialized || initializationPromise) {
      debugLog('RevenueCat already initialized or initializing');
      return initializationPromise;
    }

    initializationPromise = (async () => {
      try {
        debugLog('Starting RevenueCat initialization...');
        
        // Skip on web platform
        if (!Capacitor.isNativePlatform()) {
          debugLog('Web platform detected - using development mode');
          setSubscription({
            isActive: false, // Set to false for paywall testing
            expirationDate: null,
            productId: 'web-dev',
            offeringId: 'web-dev'
          });
          setIsLoading(false);
          return;
        }

        // Fetch API key from Supabase
        debugLog('Fetching API key from Supabase...');
        const { data, error } = await supabase.functions.invoke('revenuecat-config');
        
        if (error) {
          throw new Error(`Failed to fetch RevenueCat config: ${error.message}`);
        }

        if (!data?.publicKey || data.developmentMode) {
          debugLog('No API key - using development mode');
          setSubscription({
            isActive: false,
            expirationDate: null,
            productId: 'dev-mode',
            offeringId: 'dev-mode'
          });
          setIsLoading(false);
          return;
        }

        debugLog('API key received, configuring RevenueCat...');
        
        // Configure RevenueCat
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
          description: "Running in development mode. Purchases are disabled."
        });
      } finally {
        setIsLoading(false);
      }
    })();

    return initializationPromise;
  }, [user?.id, debugLog, toast]);

  // Fetch offerings with detailed logging
  const fetchOfferings = useCallback(async () => {
    try {
      if (!isRevenueCatInitialized || !Capacitor.isNativePlatform()) {
        debugLog('Skipping offerings fetch - not initialized or not native');
        return;
      }

      debugLog('Fetching offerings...');
      const offeringsData = await Purchases.getOfferings();
      
      debugLog('Raw offerings data received:', {
        current: offeringsData.current?.identifier,
        allCount: Object.keys(offeringsData.all || {}).length
      });

      if (offeringsData.current) {
        debugLog('Current offering packages:', 
          offeringsData.current.availablePackages?.map(pkg => ({
            identifier: pkg.identifier,
            productId: pkg.product.identifier,
            price: pkg.product.priceString
          }))
        );

        // Check for our specific product
        const hasTargetProduct = offeringsData.current.availablePackages?.some(
          pkg => pkg.product.identifier === 'gs_1299_1m'
        );
        debugLog(`Target product 'gs_1299_1m' found: ${hasTargetProduct}`);
      }

      const allOfferings = Object.values(offeringsData.all || {});
      setOfferings(allOfferings);
      debugLog(`Offerings loaded: ${allOfferings.length}`);

    } catch (error) {
      debugLog('Failed to fetch offerings', error);
      
      toast({
        variant: "destructive",
        title: "Could not load subscription options",
        description: "Please check your internet connection and try again."
      });
    }
  }, [debugLog, toast]);

  // Fetch subscription status
  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      if (!isRevenueCatInitialized || !Capacitor.isNativePlatform()) {
        debugLog('Skipping subscription status fetch');
        return subscription;
      }

      debugLog('Fetching customer info...');
      const { customerInfo } = await Purchases.getCustomerInfo();
      
      const isPro = Boolean(customerInfo.entitlements.active?.["pro"]?.isActive);
      debugLog(`Subscription status: ${isPro ? 'Active' : 'Inactive'}`);

      let expirationDate = null;
      let productId = null;
      let offeringId = null;

      if (isPro && customerInfo.activeSubscriptions?.length > 0) {
        const subId = customerInfo.activeSubscriptions[0];
        
        if (customerInfo.allExpirationDates?.[subId]) {
          expirationDate = new Date(customerInfo.allExpirationDates[subId] * 1000);
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

  // Purchase product with comprehensive error handling
  const purchaseProduct = useCallback(async (productId: string) => {
    try {
      if (!Capacitor.isNativePlatform()) {
        toast({
          title: "Feature Available on Mobile",
          description: "Subscription purchases are available on the mobile app."
        });
        return false;
      }

      if (!isRevenueCatInitialized) {
        throw new Error('RevenueCat not initialized');
      }

      debugLog(`Starting purchase for product: ${productId}`);
      setIsLoading(true);

      const result = await Purchases.purchaseStoreProduct({ productIdentifier: productId });
      
      const isProActive = result.customerInfo.entitlements.active?.["pro"]?.isActive || false;
      
      if (isProActive) {
        debugLog('Purchase successful - Pro access activated');
        
        toast({
          title: "Upgrade Successful! 🎉",
          description: "Welcome to Pro! You now have access to all premium features."
        });
        
        await fetchSubscriptionStatus();
        return true;
      } else {
        debugLog('Purchase processed but Pro access not activated');
        
        toast({
          variant: "destructive",
          title: "Purchase Issue",
          description: "Your purchase was processed, but Pro access could not be activated. Please contact support."
        });
        return false;
      }

    } catch (error: any) {
      debugLog('Purchase failed', error);
      
      // Handle specific error cases
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

  // Restore purchases
  const restorePurchases = useCallback(async () => {
    try {
      if (!Capacitor.isNativePlatform()) {
        toast({
          title: "Feature Available on Mobile",
          description: "Restore purchases is only available on the mobile app."
        });
        return false;
      }

      if (!isRevenueCatInitialized) {
        throw new Error('RevenueCat not initialized');
      }

      debugLog('Starting purchase restoration...');
      setIsLoading(true);

      const { customerInfo } = await Purchases.restorePurchases();
      const isPro = Boolean(customerInfo.entitlements.active?.["pro"]?.isActive);

      debugLog(`Restore completed - Pro status: ${isPro}`);

      if (isPro) {
        toast({
          title: "Purchases Restored Successfully! 🎉",
          description: "Your Pro subscription has been restored."
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
        description: "Could not restore your purchases. Please try again."
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [debugLog, toast, fetchSubscriptionStatus]);

  // Initialize on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      debugLog('User authenticated, initializing RevenueCat...');
      initializeRevenueCat();
    } else {
      debugLog('No user, skipping RevenueCat initialization');
      setIsLoading(false);
    }
  }, [user?.id, initializeRevenueCat]);

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
