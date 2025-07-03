import { useState, useEffect, useCallback } from 'react';
import { Purchases, PurchasesOffering, LOG_LEVEL, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { REVENUECAT_CONFIG } from '@/config/revenueCat';

export type SubscriptionStatus = {
  isActive: boolean;
  expirationDate: Date | null;
  productId: string | null;
  offeringId: string | null;
};

// Use Promise-based initialization to prevent race conditions
let initializationPromise: Promise<void> | null = null;
let isInitialized = false;

export const useRevenueCatManager = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOffering[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    isActive: false,
    expirationDate: null,
    productId: null,
    offeringId: null,
  });
  const { toast } = useToast();
  const { user } = useAuth();

  const initializeRevenueCat = useCallback(async () => {
    // If already initialized, return immediately
    if (isInitialized) return;
    
    // If initialization is in progress, wait for it to complete
    if (initializationPromise) {
      await initializationPromise;
      return;
    }
    
    // Create new initialization promise to prevent race conditions
    initializationPromise = (async () => {
      try {
        setIsLoading(true);

        // Web fallback - always free for testing
        if (!Capacitor.isNativePlatform()) {
          console.log('🌐 Web platform - setting subscription to false');
          setSubscription({
            isActive: false,
            expirationDate: null,
            productId: null,
            offeringId: null
          });
          return;
        }

        console.log('📱 Native platform - initializing RevenueCat...');

        // Get API key
        const { data, error } = await supabase.functions.invoke('revenuecat-config');
        if (error || !data?.publicKey) {
          console.log('❌ RevenueCat API key not available');
          throw new Error('No API key');
        }

        console.log('🔑 API key received, configuring RevenueCat...');

        // Configure RevenueCat
        await Purchases.configure({
          apiKey: data.publicKey,
          appUserID: user?.id || null
        });

        isInitialized = true;

        // Load customer info
        const { customerInfo } = await Purchases.getCustomerInfo();
        
        // Check subscription status
        const isPro = Boolean(customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive);
        
        console.log('💳 REVENUECAT STATUS:', {
          userId: user?.id,
          entitlementId: REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER,
          hasActiveEntitlements: Object.keys(customerInfo.entitlements.active || {}).length > 0,
          activeEntitlements: customerInfo.entitlements.active,
          isPro
        });

        setSubscription({
          isActive: isPro,
          expirationDate: null,
          productId: null,
          offeringId: null
        });

        // Load offerings
        const offeringsData = await Purchases.getOfferings();
        setOfferings(Object.values(offeringsData.all || {}));

      } catch (error) {
        console.log('❌ RevenueCat initialization failed:', error);
        // Default to free user
        setSubscription({
          isActive: false,
          expirationDate: null,
          productId: null,
          offeringId: null
        });
      } finally {
        setIsLoading(false);
      }
    })();
    
    await initializationPromise;
  }, [user?.id]);

  const fetchSubscriptionStatus = useCallback(async () => {
    if (!isInitialized || !Capacitor.isNativePlatform()) return { isActive: false, expirationDate: null, productId: null, offeringId: null };

    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      const isPro = Boolean(customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive);
      
      console.log('🔄 fetchSubscriptionStatus result:', { isPro });
      
      const newStatus = {
        isActive: isPro,
        expirationDate: subscription.expirationDate,
        productId: subscription.productId,
        offeringId: subscription.offeringId
      };
      
      setSubscription(newStatus);
      return newStatus;
    } catch (error) {
      console.log('fetchSubscriptionStatus failed:', error);
      const fallbackStatus = { isActive: false, expirationDate: null, productId: null, offeringId: null };
      setSubscription(fallbackStatus);
      return fallbackStatus;
    }
  }, [subscription.expirationDate, subscription.productId, subscription.offeringId]);

  const purchaseProduct = useCallback(async (product: PurchasesPackage['product']) => {
    if (!Capacitor.isNativePlatform()) {
      // Web simulation
      setSubscription({
        isActive: true,
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        productId: product.identifier,
        offeringId: 'web-simulation'
      });
      toast({ title: "Purchase Successful", description: "Welcome to Pro!" });
      return true;
    }

    if (!isInitialized) return false;

    try {
      setIsLoading(true);
      const result = await Purchases.purchaseStoreProduct(product);
      
      const isPro = result.customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive || false;
      
      if (isPro) {
        toast({ title: "Welcome to Pro! 🎉", description: "Your subscription is now active!" });
        await fetchSubscriptionStatus();
        return true;
      }
      
      return false;
    } catch (error: any) {
      if (!error.message?.includes('cancelled')) {
        toast({ variant: "destructive", title: "Purchase Failed", description: "Please try again." });
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, fetchSubscriptionStatus]);

  const restorePurchases = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || !isInitialized) return false;

    try {
      setIsLoading(true);
      const { customerInfo } = await Purchases.restorePurchases();
      const isPro = Boolean(customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive);

      if (isPro) {
        toast({ title: "Purchases Restored!", description: "Your Pro subscription has been restored." });
        await fetchSubscriptionStatus();
        return true;
      } else {
        toast({ title: "No Purchases Found", description: "We couldn't find any previous subscriptions." });
        return false;
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Restore Failed", description: "Could not restore purchases." });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, fetchSubscriptionStatus]);

  const refreshSubscription = useCallback(async () => {
    await fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  useEffect(() => {
    if (user) {
      initializeRevenueCat();
    }
  }, [user, initializeRevenueCat]);

  return {
    subscription,
    isLoading,
    offerings,
    purchaseProduct,
    restorePurchases,
    refreshSubscription
  };
};
