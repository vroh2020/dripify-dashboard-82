
import { createContext, useContext, ReactNode } from 'react';
import { useRevenueCatSimple, SubscriptionStatus } from '@/hooks/useRevenueCatSimple';

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
    subscription,
    offerings,
    fetchSubscriptionStatus,
    purchaseProduct,
    restorePurchases
  } = useRevenueCatSimple();

  const refreshSubscription = async (): Promise<void> => {
    await fetchSubscriptionStatus();
  };

  const value = {
    isPro: subscription.isActive,
    isLoading,
    expirationDate: subscription.expirationDate,
    purchaseProduct,
    restorePurchases,
    refreshSubscription,
    offerings
  };

  console.log('🔄 SimpleSubscriptionProvider: isPro =', value.isPro, 'isLoading =', value.isLoading);

  return (
    <SimpleSubscriptionContext.Provider value={value}>
      {children}
    </SimpleSubscriptionContext.Provider>
  );
};
