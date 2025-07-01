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

let isInitialized = false;

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

  const initializeRevenueCat = useCallback(async () => {
    if (isInitialized) return;

    try {
      // Web fallback
      if (!Capacitor.isNativePlatform()) {
        setSubscription({
          isActive: false,
          expirationDate: null,
          productId: 'web-dev',
          offeringId: 'web-dev'
        });
        setIsLoading(false);
        return;
      }

      // Get API key
      const { data } = await supabase.functions.invoke('revenuecat-config');
      if (!data?.publicKey) {
        setIsLoading(false);
        return;
      }

      // Configure RevenueCat
      await Purchases.configure({
        apiKey: data.publicKey,
        appUserID: user?.id || null
      });

      isInitialized = true;

      // Load data
      const [offeringsData, customerInfo] = await Promise.all([
        Purchases.getOfferings(),
        Purchases.getCustomerInfo()
      ]);

      // Set offerings
      setOfferings(Object.values(offeringsData.all || {}));

      // Set subscription status
      const isPro = Boolean(customerInfo.customerInfo.entitlements.active?.[REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER]?.isActive);
      
      console.log('🔍 SUBSCRIPTION DEBUG:', {
        entitlementId: REVENUECAT_CONFIG.ENTITLEMENT_IDENTIFIER,
        entitlements: customerInfo.customerInfo.entitlements,
        activeEntitlements: customerInfo.customerInfo.entitlements.active,
        isPro
      });
      
      let expirationDate = null;
      if (isPro && customerInfo.customerInfo.activeSubscriptions?.length > 0) {
        const subId = customerInfo.customerInfo.activeSubscriptions[0];
        if (customerInfo.customerInfo.allExpirationDates?.[subId]) {
          expirationDate = new Date(customerInfo.customerInfo.allExpirationDates[subId] * 1000);
        }
      }

      setSubscription({
        isActive: isPro,
        expirationDate,
        productId: customerInfo.customerInfo.activeSubscriptions?.[0] || null,
        offeringId: customerInfo.customerInfo.allPurchasedProductIdentifiers?.[0] || null
      });

    } catch (error) {
      console.log('RevenueCat init failed:', error);
      // Ensure subscription is false on error
      setSubscription({
        isActive: false,
        expirationDate: null,
        productId: null,
        offeringId: null
      });
    } finally {
      setIsLoading(false);
    }
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
  }, [subscription]);

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

  useEffect(() => {
    initializeRevenueCat();
  }, [initializeRevenueCat]);

  return {
    isLoading,
    subscription,
    offerings,
    initialized: isInitialized,
    fetchOfferings: () => {},
    fetchSubscriptionStatus,
    purchaseProduct,
    restorePurchases
  };
};
