import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from './useAuthState';

interface OnboardingStatus {
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  checkOnboardingStatus: () => Promise<void>;
}

export function useOnboardingStatus(): OnboardingStatus {
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const { isAuthenticated, user } = useAuthState();

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

      // SIMPLE: Only check the explicit flag
      setHasCompletedOnboarding(profile?.onboarding_completed === true);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setHasCompletedOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  return {
    isLoading,
    hasCompletedOnboarding,
    checkOnboardingStatus
  };
} 