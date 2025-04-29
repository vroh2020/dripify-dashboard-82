
import { useState, useEffect } from 'react';
import revenueCatService, { RevenueCatStatus } from '@/services/revenueCat';
import Logger from '@/utils/logger';

export function useSubscription() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [status, setStatus] = useState<RevenueCatStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeAndCheckSubscription();
  }, []);

  const initializeAndCheckSubscription = async () => {
    try {
      setIsInitializing(true);
      setError(null);
      
      // Initialize RevenueCat
      await revenueCatService.initialize();
      
      // Get subscription status
      await refreshSubscriptionStatus();
    } catch (err) {
      Logger.error('Failed to initialize subscription:', err);
      setError('Failed to initialize subscription service');
    } finally {
      setIsInitializing(false);
    }
  };

  const refreshSubscriptionStatus = async () => {
    try {
      const status = await revenueCatService.getSubscriptionStatus();
      setStatus(status);
      setIsSubscribed(status.isPro);
      return status;
    } catch (err) {
      Logger.error('Failed to refresh subscription status:', err);
      setError('Failed to check subscription status');
      return null;
    }
  };

  return {
    isInitializing,
    isSubscribed,
    status,
    error,
    refreshSubscriptionStatus
  };
}
