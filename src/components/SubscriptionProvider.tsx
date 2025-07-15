import { useEffect } from 'react';
import { useRevenueCatManager } from '../hooks/useRevenueCatManager';
import { Capacitor } from '@capacitor/core';

interface SubscriptionProviderProps {
  children: React.ReactNode;
  apiKey?: string;
}

export const SubscriptionProvider = ({ children, apiKey }: SubscriptionProviderProps) => {
  const { refreshSubscription } = useRevenueCatManager();

  useEffect(() => {
    // Only initialize RevenueCat on native platforms (iOS/Android)
    if (!Capacitor.isNativePlatform()) {
      console.log('RevenueCat: Skipping initialization on web platform');
      return;
    }

    // Refresh subscription status on mount
    refreshSubscription();
  }, [refreshSubscription]);

  return <>{children}</>;
};