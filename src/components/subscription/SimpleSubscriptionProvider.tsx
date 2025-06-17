
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

  const purchaseProduct = async (productId?: string): Promise<boolean> => {
    const availablePackages = offerings?.availablePackages || [];
    const packageToPurchase = availablePackages[0];
    
    if (!packageToPurchase) return false;
    
    try {
      await purchasePackage(packageToPurchase);
      return true;
    } catch (error) {
      console.error('Purchase failed:', error);
      return false;
    }
  };

  const handleRestorePurchases = async (): Promise<boolean> => {
    try {
      await restorePurchases();
      return true;
    } catch (error) {
      console.error('Restore failed:', error);
      return false;
    }
  };

  const expirationDate = customerInfo?.entitlements?.active?.pro?.expirationDate 
    ? new Date(customerInfo.entitlements.active.pro.expirationDate)
    : null;

  const value = {
    isPro: hasActiveSubscription(),
    isLoading,
    expirationDate,
    purchaseProduct,
    restorePurchases: handleRestorePurchases,
    refreshSubscription,
    offerings: offerings?.availablePackages || []
  };

  return (
    <SimpleSubscriptionContext.Provider value={value}>
      {children}
    </SimpleSubscriptionContext.Provider>
  );
};
