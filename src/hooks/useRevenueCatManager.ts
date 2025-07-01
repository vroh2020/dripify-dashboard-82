import { useState, useEffect, useCallback } from 'react';
import { Purchases, PurchasesOffering, LOG_LEVEL, PurchasesPackage } from '@revenuecat/purchases-capacitor';
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

  // Debug log subscription state changes with detailed tracking
  useEffect(() => {
    debugLog('📊 Subscription state updated:', {
      isActive: subscription.isActive,
      productId: subscription.productId,
      expirationDate: subscription.expirationDate?.toISOString() || 'none',
      offeringId: subscription.offeringId
    });
    
    // Track the source of subscription changes
    console.log('🔍 SUBSCRIPTION STATE CHANGE:', {
      isPro: subscription.isActive,
      source: subscription.offeringId,
      timestamp: new Date().toISOString()
    });
  }, [subscription, debugLog]);

  // Initialize RevenueCat with better error handling
  const initializeRevenueCat = useCallback(async () => {
    if (isRevenueCatInitialized || initializationPromise) {
      debugLog('RevenueCat already initialized');
      return initializationPromise;
    }

    initializationPromise = (async () => {
      try {
        debugLog('Starting RevenueCat initialization...');
        
        // Skip on web platform - use development mode with NEUTRAL state
        if (!Capacitor.isNativePlatform()) {
          debugLog('Web platform detected - using development mode with NEUTRAL subscription state');
          // Don't set isActive immediately - let onboarding/payment flow handle it
          setIsLoading(false);
          debugLog('Web platform initialized - subscription state will be managed by payment flow');
          return;
        }

        // Fetch API key from Supabase Edge Function
        debugLog('Fetching RevenueCat config from Supabase...');
        const { data, error } = await supabase.functions.invoke('revenuecat-config');
        
        if (error) {
          throw new Error(`Failed to fetch RevenueCat config: ${error.message}`);
        }

        if (!data?.publicKey) {
          debugLog('API key not available - using development mode');
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

        // Fetch initial data with better error handling
        await Promise.allSettled([
          fetchOfferings(),
          fetchSubscriptionStatus()
        ]);

      } catch (error) {
        debugLog('RevenueCat initialization failed', error);
        
        const errorMessage = error?.message || '';
        
        // Check for specific simulator errors and provide helpful guidance
        if (errorMessage.includes('No active account')) {
          debugLog('iOS Simulator needs Apple ID sign-in');
          toast({
            title: "iOS Simulator Setup Required",
            description: "Sign in with your Apple ID in iOS Simulator: Device → Sign In to Apple ID",
            duration: 8000
          });
        } else if (errorMessage.includes('None of the products registered')) {
          debugLog('StoreKit configuration issue detected');
          toast({
            title: "StoreKit Configuration Missing",
            description: "Add DripMax.storekit to Xcode project and configure scheme settings.",
            duration: 8000
          });
        }
        
        // Fallback to development mode for testing - don't force isActive state
        debugLog('Fallback mode - subscription state managed by payment flow');
        
      } finally {
        setIsLoading(false);
      }
    })();

    return initializationPromise;
  }, [user?.id, debugLog, toast]);

  // Fetch offerings with improved error handling
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
        
        if (!hasTargetProduct) {
          debugLog('Target product not found - check configuration');
          toast({
            title: "Product Not Found",
            description: `Product ID "${REVENUECAT_CONFIG.products.monthly}" not found in StoreKit configuration.`,
            variant: "destructive",
            duration: 8000
          });
        }
      } else {
        debugLog('No current offering available');
        toast({
          title: "No Offerings Available",
          description: "Could not load subscription options. Check StoreKit configuration.",
          variant: "destructive",
          duration: 6000
        });
      }

      const allOfferings = Object.values(offeringsData.all || {});
      setOfferings(allOfferings);
      debugLog(`Successfully loaded ${allOfferings.length} offerings`);

    } catch (error) {
      debugLog('Failed to fetch offerings', error);
      
      const errorMessage = error?.message || '';
      if (errorMessage.includes('None of the products registered')) {
        toast({
          variant: "destructive",
          title: "StoreKit Setup Needed",
          description: "Add DripMax.storekit to Xcode and set in scheme options.",
          duration: 8000
        });
      } else if (errorMessage.includes('No active account')) {
        toast({
          variant: "destructive", 
          title: "Apple ID Required",
          description: "Sign in to Apple ID in iOS Simulator settings.",
          duration: 6000
        });
      } else {
        toast({
          variant: "destructive",
          title: "Network Error",
          description: "Could not load subscription options. Check connection.",
          duration: 4000
        });
      }
    }
  }, [debugLog, toast]);

  // Fetch subscription status with better error handling
  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      if (!isRevenueCatInitialized || !Capacitor.isNativePlatform()) {
        debugLog('Skipping subscription status fetch - web platform or not initialized');
        // On web platform, return current subscription state (don't override it)
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

  // Purchase with better simulator handling
  const purchaseProduct = useCallback(async (product: PurchasesPackage['product']) => {
    try {
      if (!product) {
        debugLog('Purchase failed: No product provided');
        throw new Error('No product provided for purchase');
      }

      debugLog('🛒 PURCHASE ATTEMPT STARTED:', { 
        productId: product.identifier, 
        isNative: Capacitor.isNativePlatform() 
      });

      if (!Capacitor.isNativePlatform()) {
        debugLog('🛒 Web platform purchase simulation - explicitly setting Pro status to TRUE');
        
        const newSubscription = {
          isActive: true,
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          productId: product.identifier,
          offeringId: 'web-simulation'
        };
        
        setSubscription(newSubscription);
        debugLog('🎉 Web platform purchase simulation completed - Pro status activated:', newSubscription);
        
        toast({
          title: "Development Mode Purchase ✅",
          description: "Simulated successful purchase - Pro access activated!"
        });
        return true;
      }

      if (!isRevenueCatInitialized) {
        throw new Error('RevenueCat not initialized');
      }

      debugLog(`Starting purchase for product: ${product.identifier}`);
      setIsLoading(true);

      const result = await Purchases.purchaseStoreProduct(product);
      
      const isProActive = result.customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive || false;
      
      if (isProActive) {
        debugLog('Purchase successful - Pro access activated');
        
        toast({
          title: "Welcome to Pro! 🎉",
          description: "Your subscription is now active!"
        });
        
        await fetchSubscriptionStatus();
        return true;
      } else {
        debugLog('Purchase completed but Pro access not activated');
        
        toast({
          variant: "destructive",
          title: "Subscription Issue",
          description: "Purchase processed but Pro access not activated."
        });
        return false;
      }

    } catch (error: any) {
      debugLog('Purchase failed', error);
      
      const errorMessage = error.message || '';
      
      if (errorMessage.includes('cancelled')) {
        toast({
          title: "Purchase Cancelled",
          description: "You cancelled the purchase."
        });
      } else if (errorMessage.includes('No active account')) {
        toast({
          variant: "destructive",
          title: "Apple ID Required",
          description: "Sign in to your Apple ID in iOS Simulator to make purchases."
        });
      } else if (errorMessage.includes('None of the products')) {
        toast({
          variant: "destructive", 
          title: "Product Not Available",
          description: "Add DripMax.storekit to Xcode project first."
        });
      } else {
        toast({
          variant: "destructive",
          title: "Purchase Failed",
          description: "There was an error processing your purchase."
        });
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [debugLog, toast, fetchSubscriptionStatus]);

  // Restore purchases with better error handling
  const restorePurchases = useCallback(async () => {
    try {
      if (!Capacitor.isNativePlatform()) {
        toast({
          title: "Web Development Mode",
          description: "Restore purchases is simulated on web platform."
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
          description: "Your Pro subscription has been restored."
        });
        
        await fetchSubscriptionStatus();
        return true;
      } else {
        toast({
          title: "No Purchases Found",
          description: "We couldn't find any previous Pro subscriptions."
        });
        return false;
      }

    } catch (error) {
      debugLog('Restore failed', error);
      
      const errorMessage = error?.message || '';
      
      if (errorMessage.includes('No active account')) {
        toast({
          variant: "destructive",
          title: "Apple ID Required", 
          description: "Sign in to Apple ID in iOS Simulator first."
        });
      } else if (errorMessage.includes('receipt')) {
        toast({
          variant: "destructive",
          title: "No Receipt Available",
          description: "No purchases to restore. StoreKit configuration may be missing."
        });
      } else {
        toast({
          variant: "destructive",
          title: "Restore Failed",
          description: "Could not restore purchases. Try again later."
        });
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [debugLog, toast, fetchSubscriptionStatus]);

  // Initialize on mount
  useEffect(() => {
    debugLog('Initializing RevenueCat Manager...');
    initializeRevenueCat();
  }, [initializeRevenueCat, debugLog]);

  // Development helper to reset subscription state
  const resetSubscriptionForTesting = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      debugLog('🔄 DEVELOPMENT: Resetting subscription state for testing');
      setSubscription({
        isActive: false,
        expirationDate: null,
        productId: null,
        offeringId: null,
      });
      console.log('✅ Subscription state reset to false for testing');
      console.log('🔄 You may need to refresh the page for onboarding to restart properly');
    }
  }, [debugLog]);

  // Development helper to manually activate Pro (for testing)
  const activateProForTesting = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      debugLog('🔄 DEVELOPMENT: Manually activating Pro status for testing');
      const testSubscription = {
        isActive: true,
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        productId: 'test-pro',
        offeringId: 'test-pro'
      };
      setSubscription(testSubscription);
      console.log('✅ Pro status activated for testing:', testSubscription);
    }
  }, [debugLog]);

  // Expose development functions
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // @ts-ignore - Development only
      window.resetSubscription = resetSubscriptionForTesting;
      // @ts-ignore - Development only  
      window.activatePro = activateProForTesting;
      console.log('🛠️  Development helpers available:');
      console.log('   - window.resetSubscription() - Reset Pro status to false');
      console.log('   - window.activatePro() - Activate Pro status for testing');
    }
  }, [resetSubscriptionForTesting, activateProForTesting]);

  return {
    isLoading,
    subscription,
    offerings,
    initialized: isRevenueCatInitialized,
    fetchOfferings,
    fetchSubscriptionStatus,
    purchaseProduct,
    restorePurchases,
    resetSubscriptionForTesting, // Include in return for development
    activateProForTesting // Include in return for development
  };
};
