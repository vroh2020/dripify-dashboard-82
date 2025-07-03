import { createContext, useContext, ReactNode, useRef } from 'react';
import { useRevenueCatManager, SubscriptionStatus } from '@/hooks/useRevenueCatManager';
import { PurchasesPackage } from '@revenuecat/purchases-capacitor';

interface SubscriptionContextType {
  isPro: boolean;
  isLoading: boolean;
  expirationDate: Date | null;
  checkSubscription: () => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
  purchaseProduct: (product: PurchasesPackage['product']) => Promise<boolean>;
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
    purchaseProduct,
    restorePurchases,
    refreshSubscription
  } = useRevenueCatManager();

  // Check if user has Pro subscription
  const checkSubscription = async (): Promise<boolean> => {
    await refreshSubscription();
    return subscription.isActive;
  };

  // Force refresh the subscription status
  const refreshSubscriptionStatus = async (): Promise<void> => {
    await refreshSubscription();
  };

  const value = {
    isPro: subscription.isActive,
    isLoading,
    expirationDate: subscription.expirationDate,
    checkSubscription,
    refreshSubscription: refreshSubscriptionStatus,
    purchaseProduct,
    restorePurchases,
    offerings
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
