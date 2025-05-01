import { useEffect } from 'react';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { Purchases } from '@revenuecat/purchases-capacitor';

interface SubscriptionProviderProps {
  children: React.ReactNode;
  apiKey: string;
}

export const SubscriptionProvider = ({ children, apiKey }: SubscriptionProviderProps) => {
  const { initialize, refreshCustomerInfo } = useSubscriptionStore();

  useEffect(() => {
    initialize(apiKey);

    // Set up RevenueCat event listeners
    const setupListeners = async () => {
      await Purchases.addCustomerInfoUpdateListener(({ customerInfo }) => {
        useSubscriptionStore.getState().setCustomerInfo(customerInfo);
      });
    };

    setupListeners();

    return () => {
      // Cleanup listeners if needed
    };
  }, [apiKey, initialize]);

  return <>{children}</>;
}; 