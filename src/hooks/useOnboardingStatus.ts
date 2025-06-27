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
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      setHasCompletedOnboarding(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error || !profile) {
        setHasCompletedOnboarding(false);
      } else {
        // Check if user has completed onboarding (either explicit flag or has data)
        const hasFlag = (profile as any).onboarding_completed === true;
        const hasData = (profile as any).age_range && (profile as any).main_goal;
        setHasCompletedOnboarding(hasFlag || hasData);
      }
    } catch (error) {
      console.error('🚨 Exception in checkOnboardingStatus:', error);
      console.error('🚨 Full error object:', JSON.stringify(error, null, 2));
      setHasCompletedOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    console.log('🔍 useOnboardingStatus - isAuthenticated:', isAuthenticated, 'user:', user?.id);
    checkOnboardingStatus();
  }, [isAuthenticated, user?.id, checkOnboardingStatus]);

  return {
    isLoading,
    hasCompletedOnboarding,
    checkOnboardingStatus
  };
} 