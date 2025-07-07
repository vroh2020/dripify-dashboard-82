import { useState, useEffect, useCallback } from 'react';
import { useRevenueCatManager } from './useRevenueCatManager';
import { useToast } from './use-toast';
import { REVENUECAT_CONFIG } from '@/config/revenueCat';

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
        // Offerings may not have loaded yet (especially immediately after login).
        // Fall back to a minimal product object so the web-demo flow can still proceed.
        resolvedProduct = {
          identifier: productId,
          title: productId === REVENUECAT_CONFIG.products.weekly ? 'Weekly Premium' : 'Monthly Premium',
          description: 'Pro subscription',
          price: productId === REVENUECAT_CONFIG.products.weekly ? 4.99 : 12.99,
          priceString: productId === REVENUECAT_CONFIG.products.weekly ? '$4.99' : '$12.99',
          currencyCode: 'USD',
          subscriptionPeriod: productId === REVENUECAT_CONFIG.products.weekly ? 'P1W' : 'P1M',
        } as any; // Cast because we are only using a subset of fields on web
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
