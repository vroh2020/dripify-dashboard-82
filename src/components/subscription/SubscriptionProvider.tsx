
import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useRevenueCat, SubscriptionStatus } from '@/hooks/useRevenueCat';
import { useSession } from '@/hooks/useSession';

interface SubscriptionContextType {
  isPro: boolean;
  isLoading: boolean;
  expirationDate: Date | null;
  checkSubscription: () => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPro: false,
  isLoading: true,
  expirationDate: null,
  checkSubscription: async () => false,
  refreshSubscription: async () => {},
});

export const useSubscription = () => useContext(SubscriptionContext);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider = ({ children }: SubscriptionProviderProps) => {
  const { user } = useSession();
  const { subscription, isLoading, fetchSubscriptionStatus } = useRevenueCat();
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionStatus>(subscription);

  useEffect(() => {
    setSubscriptionState(subscription);
  }, [subscription]);

  // Check if user has Pro subscription
  const checkSubscription = async (): Promise<boolean> => {
    if (!user) return false;
    
    const status = await fetchSubscriptionStatus();
    return status.isActive;
  };

  // Force refresh the subscription status
  const refreshSubscription = async (): Promise<void> => {
    if (!user) return;
    
    await fetchSubscriptionStatus();
  };

  const value = {
    isPro: subscriptionState.isActive,
    isLoading,
    expirationDate: subscriptionState.expirationDate,
    checkSubscription,
    refreshSubscription
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
