import { useState, useEffect, useCallback } from 'react';
import { useRevenueCatManager } from './useRevenueCatManager';
import { useToast } from './use-toast';

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

  const purchaseProduct = useCallback(async (productId: string) => {
    if (isPurchasing) return false;
    
    setIsPurchasing(true);
    try {
      // Find the product object from offerings using the productId
      const product = offerings
        ?.flatMap(offering => offering.availablePackages)
        ?.find(pkg => pkg.product.identifier === productId)
        ?.product;
      
      if (!product) {
        console.error(`Product not found with ID: ${productId}`);
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
    purchaseProduct,
    restorePurchases
  };
};