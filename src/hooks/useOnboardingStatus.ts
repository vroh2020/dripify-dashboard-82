import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from './useAuthState';
import { useSubscription } from '@/components/subscription/SubscriptionProvider';

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
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Onboarding check error:', error);
        
        // FASTER: Reduce retry delay and count
        if (retryCount < 2) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            checkOnboardingStatus();
          }, 500); // Only 500ms delay instead of exponential backoff
          return;
        }
        
        // After retries, assume not completed
        setHasCompletedOnboarding(false);
        setIsLoading(false);
        return;
      }

      // CRITICAL: Strict validation for dashboard access
      // User must have BOTH completed onboarding AND active subscription
      const onboardingCompleted = profile?.onboarding_completed === true;
      const hasActiveSubscription = isPro === true;
      
      const completed = onboardingCompleted && hasActiveSubscription;
      
      console.log('📊 Onboarding Status Check:', {
        userId: user.id,
        onboardingCompleted,
        hasActiveSubscription,
        finalResult: completed
      });

      setHasCompletedOnboarding(completed);
      setRetryCount(0); // Reset retry count on success
      
    } catch (error) {
      console.error('Error checking onboarding:', error);
      
      // FASTER: Quick retry with short delay
      if (retryCount < 2) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          checkOnboardingStatus();
        }, 500);
        return;
      }
      
      // After retries, fail safe to not completed
      setHasCompletedOnboarding(false);
    } finally {
      // FIXED: Always set loading to false when done
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, isPro, retryCount]);

  useEffect(() => {
    // Reset retry count when key dependencies change
    setRetryCount(0);
    checkOnboardingStatus();
  }, [isAuthenticated, user?.id, isPro]);

  // FASTER: Reduce timeout to 3 seconds instead of 10
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('⚠️ Onboarding status check timeout - forcing completion');
        setIsLoading(false);
        // Fail safe to require onboarding
        setHasCompletedOnboarding(false);
      }
    }, 3000); // Much faster timeout

    return () => clearTimeout(timeout);
  }, [isLoading]);

  return {
    isLoading,
    hasCompletedOnboarding,
    checkOnboardingStatus,
    retryCount
  };
} 