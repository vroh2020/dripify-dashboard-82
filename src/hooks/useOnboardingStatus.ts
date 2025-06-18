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
      
      // First check if user has any style analyses (indicates completed onboarding)
      const { data: analyses, error: analysisError } = await supabase
        .from('style_analyses')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (!analysisError && analyses && analyses.length > 0) {
        setHasCompletedOnboarding(true);
        setIsLoading(false);
        return;
      }

      // Fallback: check profile for onboarding completion
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking onboarding status:', error);
        // If no profile exists, user hasn't completed onboarding
        setHasCompletedOnboarding(false);
      } else {
        // Check if profile has onboarding data (indicates completion)
        const hasOnboardingData = profile && (
          (profile as any).onboarding_completed === true ||
          (profile as any).age_range ||
          (profile as any).main_goal
        );
        setHasCompletedOnboarding(hasOnboardingData || false);
        console.log('🔍 Onboarding status determined:', hasOnboardingData || false);
      }
    } catch (error) {
      console.error('Error in checkOnboardingStatus:', error);
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