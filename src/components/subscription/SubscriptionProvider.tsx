
import { createContext, useContext, ReactNode } from 'react';
import { useRevenueCatManager, SubscriptionStatus } from '@/hooks/useRevenueCatManager';

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
    subscription,
    offerings,
    fetchSubscriptionStatus,
    purchaseProduct,
    restorePurchases
  } = useRevenueCatManager();

  // Check if user has Pro subscription
  const checkSubscription = async (): Promise<boolean> => {
    const status = await fetchSubscriptionStatus();
    return status.isActive;
  };

  // Force refresh the subscription status
  const refreshSubscription = async (): Promise<void> => {
    await fetchSubscriptionStatus();
  };

  const value = {
    isPro: subscription.isActive,
    isLoading,
    expirationDate: subscription.expirationDate,
    checkSubscription,
    refreshSubscription,
    purchaseProduct,
    restorePurchases,
    offerings
  };

  console.log('🔄 SubscriptionProvider: isPro =', value.isPro, 'isLoading =', value.isLoading);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
