import { useState, useEffect, useCallback } from 'react';
import { useRevenueCatManager } from './useRevenueCatManager';
import { useToast } from './use-toast';
import { PurchasesPackage } from '@revenuecat/purchases-capacitor';

export const useRevenueCat = () => {
  const {
    isLoading,
    subscription,
    offerings,
    purchaseProduct: managerPurchase,
    restorePurchases: managerRestore
  } = useRevenueCatManager();
  
  const { toast } = useToast();
  const [isPurchasing, setIsPurchasing] = useState(false);

  const purchaseProduct = useCallback(async (product: PurchasesPackage['product']) => {
    if (isPurchasing) return false;
    
    setIsPurchasing(true);
    try {
      if (!product || !product.identifier) {
        console.error('No valid product provided for purchase');
        toast({
          title: "Product Error",
          description: "Product not available for purchase.",
          variant: "destructive"
        });
        return false;
      }
      
      const result = await managerPurchase(product); // Pass the full product object
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
  }, [managerPurchase, isPurchasing, toast]);

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
    purchaseProduct,
    restorePurchases
  };
};