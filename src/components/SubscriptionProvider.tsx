import { useEffect } from 'react';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

interface SubscriptionProviderProps {
  children: React.ReactNode;
  apiKey: string;
}

export const SubscriptionProvider = ({ children, apiKey }: SubscriptionProviderProps) => {
  const { subscription } = useRevenueCat();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      console.log('RevenueCat: Skipping initialization on web platform');
      return;
    }
  }, [apiKey]);

  return <>{children}</>;
};