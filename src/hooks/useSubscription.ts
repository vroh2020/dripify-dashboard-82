import { useState, useEffect, useCallback } from 'react';
import { PurchasesPackage, CustomerInfo } from '@revenuecat/purchases-capacitor';
import { getOfferings, getPurchaserInfo, purchasePackage as rcPurchasePackage, restorePurchases as rcRestorePurchases } from '../services/revenueCatService';

export const useSubscription = () => {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadOfferings = useCallback(async () => {
    try {
      const availablePackages = await getOfferings();
      setPackages(availablePackages);
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const loadCustomerInfo = useCallback(async () => {
    try {
      const info = await getPurchaserInfo();
      setCustomerInfo(info);
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const purchasePackage = useCallback(async (packageToPurchase: PurchasesPackage) => {
    try {
      setIsLoading(true);
      const info = await rcPurchasePackage(packageToPurchase);
      setCustomerInfo(info);
      return info;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check if we're on a native platform
      const isNativePlatform = () => {
        return !!(window as any).Capacitor || 
               !!(window as any).cordova || 
               /iPad|iPhone|iPod|Android/.test(navigator.userAgent);
      };

      if (!isNativePlatform()) {
        // On web, return false to indicate no restore possible
        console.log("Restore purchases not available on web platform");
        return false;
      }

      const info = await rcRestorePurchases();
      if (info) {
        setCustomerInfo(info);
        // Check if user has active entitlements
        const hasActiveEntitlements = Object.values(info.entitlements.active).some(
          (entitlement: any) => entitlement.isActive
        );
        return hasActiveEntitlements;
      }
      // Return false for no purchases found, but this is handled positively in the UI
      return false;
    } catch (err) {
      console.error("Restore purchases error:", err);
      setError(err as Error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        await loadOfferings();
        await loadCustomerInfo();
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [loadOfferings, loadCustomerInfo]);

  return {
    packages,
    customerInfo,
    isLoading,
    error,
    purchasePackage,
    restorePurchases,
    refreshCustomerInfo: loadCustomerInfo,
  };
}; 