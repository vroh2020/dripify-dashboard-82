import { useEffect } from 'react';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

interface SubscriptionProviderProps {
  children: React.ReactNode;
  apiKey: string;
}

export const SubscriptionProvider = ({ children, apiKey }: SubscriptionProviderProps) => {
  const { initialize, refreshCustomerInfo } = useSubscriptionStore();

  useEffect(() => {
    // Only initialize RevenueCat on native platforms (iOS/Android)
    if (!Capacitor.isNativePlatform()) {
      console.log('RevenueCat: Skipping initialization on web platform');
      return;
    }

    initialize(apiKey);

    // Set up RevenueCat event listeners only on native platforms
    const setupListeners = async () => {
      try {
        await Purchases.addCustomerInfoUpdateListener(({ customerInfo }) => {
          useSubscriptionStore.getState().setCustomerInfo(customerInfo);
        });
      } catch (error) {
        console.warn('RevenueCat listener setup failed:', error);
      }
    };

    setupListeners();

    return () => {
      // Cleanup listeners if needed
    };
  }, [apiKey, initialize]);

  return <>{children}</>;
}; 