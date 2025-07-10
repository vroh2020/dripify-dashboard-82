import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSubscription } from '@/components/subscription/SubscriptionProvider';
import { Capacitor } from '@capacitor/core';

interface OnboardingStatus {
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  checkOnboardingStatus: () => Promise<void>;
  retryCount: number;
}

export function useOnboardingStatus(): OnboardingStatus {
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { isAuthenticated, user } = useAuth();
  const { isPro, subscription } = useSubscription();

  const checkOnboardingStatus = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setIsLoading(false);
      setHasCompletedOnboarding(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, subscription_status')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Onboarding check error:', error);
        
        if (retryCount < 2) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            checkOnboardingStatus();
          }, 500);
          return;
        }
        
        setHasCompletedOnboarding(false);
        setIsLoading(false);
        return;
      }

      const onboardingCompleted = profile?.onboarding_completed === true;
      
      console.log('📊 Onboarding Status Check:', {
        userId: user.id,
        onboardingCompleted,
        platform: Capacitor.isNativePlatform() ? 'native' : 'web',
        revenueCatStatus: subscription.isActive,
        supabaseStatus: profile?.subscription_status,
        finalResult: onboardingCompleted
      });

      setHasCompletedOnboarding(onboardingCompleted);
      setRetryCount(0);
      
    } catch (error) {
      console.error('Error checking onboarding:', error);
      
      if (retryCount < 2) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          checkOnboardingStatus();
        }, 500);
        return;
      }
      
      setHasCompletedOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, isPro, subscription.isActive, retryCount]);

  useEffect(() => {
    setRetryCount(0);
    checkOnboardingStatus();
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('⚠️ Onboarding status check timeout - forcing completion');
        setIsLoading(false);
        setHasCompletedOnboarding(false);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [isLoading]);

  return {
    isLoading,
    hasCompletedOnboarding,
    checkOnboardingStatus,
    retryCount
  };
} 