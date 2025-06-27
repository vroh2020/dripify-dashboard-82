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
      console.log('🔍 Starting onboarding status check for user:', user.id);
      
      // Check profile for onboarding completion
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle to avoid errors when no profile exists

      console.log('🔍 Database response:', { profile, error });

      if (error) {
        console.error('🚨 Database error checking onboarding status:', error);
        console.error('🚨 Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        setHasCompletedOnboarding(false);
      } else if (!profile) {
        // If no profile exists, user hasn't completed onboarding
        console.log('🔍 No profile found, onboarding not completed');
        setHasCompletedOnboarding(false);
      } else {
        // Check if profile has onboarding completion flag
        const isComplete = (profile as any).onboarding_completed === true;
        setHasCompletedOnboarding(isComplete);
        console.log('🔍 Onboarding status determined:', isComplete);
        console.log('🔍 Profile data:', {
          onboarding_completed: (profile as any).onboarding_completed,
          age_range: (profile as any).age_range,
          main_goal: (profile as any).main_goal
        });
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