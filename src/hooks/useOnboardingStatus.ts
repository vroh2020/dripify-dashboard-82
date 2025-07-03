import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from './useAuthState';
import { useSubscription } from '@/components/subscription/SubscriptionProvider';

interface OnboardingStatus {
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  checkOnboardingStatus: () => Promise<void>;
}

export function useOnboardingStatus(): OnboardingStatus {
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const { isAuthenticated, user } = useAuthState();
  const { isPro } = useSubscription();

  const checkOnboardingStatus = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setIsLoading(false);
      setHasCompletedOnboarding(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();

      // Correct logic: Must have BOTH onboarding completed AND active subscription
      const completed = profile?.onboarding_completed === true && isPro === true;
      setHasCompletedOnboarding(completed);
      
      console.log('� ONBOARDING STATUS:', {
        onboardingCompleted: profile?.onboarding_completed,
        isPro,
        canAccessDashboard: completed
      });
      
    } catch (error) {
      console.error('Error checking onboarding:', error);
      setHasCompletedOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, isPro]);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  return {
    isLoading,
    hasCompletedOnboarding,
    checkOnboardingStatus
  };
} 