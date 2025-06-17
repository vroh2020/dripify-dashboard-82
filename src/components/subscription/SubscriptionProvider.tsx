import { createContext, useContext, ReactNode } from 'react';
import { useRevenueCatSimple } from '@/hooks/useRevenueCatSimple';

interface SubscriptionContextType {
  isPro: boolean;
  isLoading: boolean;
  expirationDate: Date | null;
  checkSubscription: () => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
  purchaseProduct: (productId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  offerings: any[];
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPro: false,
  isLoading: true,
  expirationDate: null,
  checkSubscription: async () => false,
  refreshSubscription: async () => {},
  purchaseProduct: async () => false,
  restorePurchases: async () => false,
  offerings: [],
});

export const useSubscription = () => useContext(SubscriptionContext);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider = ({ children }: SubscriptionProviderProps) => {
  const {
    isLoading,
    hasActiveSubscription,
    offerings,
    purchasePackage,
    restorePurchases,
    customerInfo
  } = useRevenueCatSimple();

  // Check if user has Pro subscription
  const checkSubscription = async (): Promise<boolean> => {
    return hasActiveSubscription('pro');
  };

  // Force refresh the subscription status  
  const refreshSubscription = async (): Promise<void> => {
    // The hook automatically refreshes, no manual action needed
  };

  // Purchase a product (adapting package purchase to product ID)
  const purchaseProduct = async (productId: string): Promise<boolean> => {
    try {
      const availablePackages = offerings?.availablePackages || [];
      const packageToPurchase = availablePackages[0]; // Use first available package
      
      if (!packageToPurchase) {
        console.error('No packages available for purchase');
        return false;
      }

      await purchasePackage(packageToPurchase);
      return true;
    } catch (error) {
      console.error('Purchase failed:', error);
      return false;
    }
  };

  const value = {
    isPro: hasActiveSubscription('pro'),
    isLoading,
    expirationDate: customerInfo?.latestExpirationDate ? new Date(customerInfo.latestExpirationDate) : null,
    checkSubscription,
    refreshSubscription,
    purchaseProduct,
    restorePurchases,
    offerings: offerings?.availablePackages || []
  };

  console.log('🔄 SubscriptionProvider: isPro =', value.isPro, 'isLoading =', value.isLoading);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
