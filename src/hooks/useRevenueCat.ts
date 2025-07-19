import { useState, useEffect, useCallback } from 'react';
import { useRevenueCatManager } from './useRevenueCatManager';
import { useToast } from './use-toast';

export const useRevenueCat = () => {
  const {
    isLoading,
    subscription,
    offerings,
    purchaseProduct: managerPurchase,
    restorePurchases: managerRestore,
    initializationError
  } = useRevenueCatManager();
  
  const { toast } = useToast();
  const [isPurchasing, setIsPurchasing] = useState(false);

  const purchaseProduct = useCallback(async (productId: string) => {
    if (isPurchasing) return false;
    
    setIsPurchasing(true);
    try {
      console.log('🛒 useRevenueCat: Looking for product:', productId);
      console.log('🛒 Available offerings:', offerings?.length || 0);
      
      // Find the product object from offerings using the productId
      const product = offerings
        ?.flatMap(offering => offering.availablePackages)
        ?.find(pkg => pkg.product.identifier === productId)
        ?.product;
      
      if (!product) {
        console.error(`🛒 useRevenueCat: Product not found with ID: ${productId}`);
        console.error('🛒 Available products:', offerings
          ?.flatMap(offering => offering.availablePackages)
          ?.map(pkg => pkg.product.identifier)
        );
        
        // Show more specific error based on the issue
        if (initializationError) {
          toast({
            title: "Subscription Service Unavailable",
            description: "We're having trouble connecting to our subscription service. Please check your internet connection and try again.",
            variant: "destructive"
          });
        } else if (!offerings || offerings.length === 0) {
          toast({
            title: "Loading Subscription Options",
            description: "Still loading subscription options. Please wait a moment and try again.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Product Configuration Error",
            description: "Product not available for purchase. Please contact support if this persists.",
            variant: "destructive"
          });
        }
        return false;
      }
      
      console.log('🛒 useRevenueCat: Purchasing product:', product.identifier);
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
  }, [managerPurchase, isPurchasing, toast, offerings, initializationError]);

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
    restorePurchases,
    initializationError
  };
};
