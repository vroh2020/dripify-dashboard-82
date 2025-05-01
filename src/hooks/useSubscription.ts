import { useState, useEffect, useCallback } from 'react';
import { PurchasesPackage, CustomerInfo } from '@revenuecat/purchases-capacitor';
import { revenueCatService } from '../services/revenueCatService';

export const useSubscription = () => {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadOfferings = useCallback(async () => {
    try {
      const availablePackages = await revenueCatService.getOfferings();
      setPackages(availablePackages);
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const loadCustomerInfo = useCallback(async () => {
    try {
      const info = await revenueCatService.getCustomerInfo();
      setCustomerInfo(info);
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const purchasePackage = useCallback(async (packageToPurchase: PurchasesPackage) => {
    try {
      setIsLoading(true);
      const info = await revenueCatService.purchasePackage(packageToPurchase);
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
      const info = await revenueCatService.restorePurchases();
      setCustomerInfo(info);
      return info;
    } catch (err) {
      setError(err as Error);
      throw err;
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