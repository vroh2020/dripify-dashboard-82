import { createContext, useContext, ReactNode } from 'react';
import { useRevenueCatSimple } from '@/hooks/useRevenueCatSimple';

interface SimpleSubscriptionContextType {
  isPro: boolean;
  isLoading: boolean;
  expirationDate: Date | null;
  purchaseProduct: (productId?: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
  offerings: any[];
}

const SimpleSubscriptionContext = createContext<SimpleSubscriptionContextType>({
  isPro: false,
  isLoading: true,
  expirationDate: null,
  purchaseProduct: async () => false,
  restorePurchases: async () => false,
  refreshSubscription: async () => {},
  offerings: [],
});

export const useSimpleSubscription = () => useContext(SimpleSubscriptionContext);

interface SimpleSubscriptionProviderProps {
  children: ReactNode;
}

export const SimpleSubscriptionProvider = ({ children }: SimpleSubscriptionProviderProps) => {
  const {
    isLoading,
    customerInfo,
    offerings,
    getCustomerInfo,
    purchasePackage,
    restorePurchases,
    hasActiveSubscription
  } = useRevenueCatSimple();

  const refreshSubscription = async (): Promise<void> => {
    await getCustomerInfo();
  };

  // Simple purchase function that works with the monthly subscription
  const purchaseProduct = async (productId?: string): Promise<boolean> => {
    try {
      if (!offerings || !offerings.availablePackages) {
        console.log('No offerings available');
        return false;
      }

      // Find the monthly package or use the first available
      const packageToPurchase = offerings.availablePackages[0];
      if (!packageToPurchase) {
        console.log('No packages available');
        return false;
      }

      await purchasePackage(packageToPurchase);
      return true;
    } catch (error) {
      console.error('Purchase failed:', error);
      return false;
    }
  };

  // Simple restore function
  const handleRestorePurchases = async (): Promise<boolean> => {
    try {
      await restorePurchases();
      return true;
    } catch (error) {
      console.error('Restore failed:', error);
      return false;
    }
  };

  // Check if user has active subscription
  const isPro = hasActiveSubscription('pro');

  // Get expiration date if available
  const expirationDate = customerInfo?.entitlements?.active?.pro?.expirationDate 
    ? new Date(customerInfo.entitlements.active.pro.expirationDate) 
    : null;

  const value = {
    isPro,
    isLoading,
    expirationDate,
    purchaseProduct,
    restorePurchases: handleRestorePurchases,
    refreshSubscription,
    offerings: offerings?.availablePackages || []
  };

  console.log('🔄 SimpleSubscriptionProvider: isPro =', value.isPro, 'isLoading =', value.isLoading);

  return (
    <SimpleSubscriptionContext.Provider value={value}>
      {children}
    </SimpleSubscriptionContext.Provider>
  );
};
