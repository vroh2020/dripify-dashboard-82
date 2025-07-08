import { useState, useEffect, useCallback } from 'react';
import { useRevenueCatManager } from './useRevenueCatManager';
import { useToast } from './use-toast';
import { REVENUECAT_CONFIG } from '@/config/revenueCat';
import { Capacitor } from '@capacitor/core';

export const useRevenueCat = () => {
  const {
    isLoading,
    subscription,
    offerings,
    fetchSubscriptionStatus,
    purchaseProduct: managerPurchase,
    restorePurchases: managerRestore
  } = useRevenueCatManager();
  
  const { toast } = useToast();
  const [isPurchasing, setIsPurchasing] = useState(false);

  const purchaseProduct = useCallback(async (productId: string) => {
    if (isPurchasing) return false;
    
    setIsPurchasing(true);
    try {
      // Find the product object from offerings using the productId
      const product = offerings
        ?.flatMap(offering => offering.availablePackages)
        ?.find(pkg => pkg.product.identifier === productId)
        ?.product;
      
      let resolvedProduct = product;

      if (!resolvedProduct) {
        // If running on native, we MUST have the real product from RevenueCat.
        if (Capacitor.isNativePlatform()) {
          toast({
            variant: 'destructive',
            title: 'Store Unavailable',
            description: 'We are still connecting to the App Store. Please try again in a moment.'
          });
          return false;
        }

        // Web-demo fallback – create a minimal product so simulation continues.
        resolvedProduct = {
          identifier: productId,
          title: productId === REVENUECAT_CONFIG.products.weekly ? 'Weekly Premium' : 'Monthly Premium',
          description: 'Pro subscription',
          price: productId === REVENUECAT_CONFIG.products.weekly ? 4.99 : 12.99,
          priceString: productId === REVENUECAT_CONFIG.products.weekly ? '$4.99' : '$12.99',
          currencyCode: 'USD',
          subscriptionPeriod: productId === REVENUECAT_CONFIG.products.weekly ? 'P1W' : 'P1M',
        } as any;
      }
      
      const result = await managerPurchase(resolvedProduct); // Pass the full/ fallback product object
      if (result) {
        toast({
          title: "Success!",
          description: "Your subscription is now active.",
        });
      }
      return result;
    } catch (error) {
      console.error('Purchase failed in useRevenueCat:', error);
      return false;
    } finally {
      setIsPurchasing(false);
    }
  }, [managerPurchase, isPurchasing, toast, offerings]);

  const restorePurchases = useCallback(async () => {
    if (isPurchasing) return false;
    
    setIsPurchasing(true);
    try {
      const result = await managerRestore();
      return result;
    } catch (error) {
      console.error('Restore failed in useRevenueCat:', error);
      return false;
    } finally {
      setIsPurchasing(false);
    }
  }, [managerRestore, isPurchasing]);

  return {
    isLoading: isLoading || isPurchasing,
    subscription,
    offerings,
    fetchSubscriptionStatus,
    purchaseProduct,
    restorePurchases
  };
};
