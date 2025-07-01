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

  // Only log when subscription state changes
  const prevStateRef = useRef<any>();
  const currentState = { isPro: value.isPro, isLoading: value.isLoading };
  
  if (JSON.stringify(prevStateRef.current) !== JSON.stringify(currentState)) {
    console.log('🔄 SubscriptionProvider state changed:', currentState);
    console.log('🔍 Full subscription object:', subscription);
    console.log('📊 isPro derived from subscription.isActive:', subscription.isActive);
    prevStateRef.current = currentState;
  }

  // Debug log for onboarding issues
  if (value.isPro && !value.isLoading) {
    console.log('⚠️  DEBUGGING: isPro is TRUE - checking if this should be false for new user');
    console.log('📋 Subscription details:', {
      isActive: subscription.isActive,
      productId: subscription.productId,
      offeringId: subscription.offeringId,
      expirationDate: subscription.expirationDate
    });
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
