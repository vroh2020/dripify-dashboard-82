import { useState, useEffect, useCallback, useRef } from 'react';
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
  const retryCountRef = useRef(0);
  const { isAuthenticated, user } = useAuth();
  const { isPro, subscription } = useSubscription();

  const checkOnboardingStatus = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      console.log('🔍 Onboarding check: User not authenticated, setting to false');
      setIsLoading(false);
      setHasCompletedOnboarding(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔍 Checking onboarding status for user:', user.id);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, subscription_status')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Onboarding check error:', error);
        
        if (retryCountRef.current < 2) {
          console.log(`🔄 Retrying onboarding check (attempt ${retryCountRef.current + 1}/3)...`);
          setTimeout(() => {
            retryCountRef.current += 1;
            checkOnboardingStatus();
          }, 500);
          return;
        }
        
        console.log('❌ Onboarding check failed after retries, setting to false');
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
        finalResult: onboardingCompleted,
        profileExists: !!profile
      });

      setHasCompletedOnboarding(onboardingCompleted);
      retryCountRef.current = 0;
      
    } catch (error) {
      console.error('Error checking onboarding:', error);
      
      if (retryCountRef.current < 2) {
        console.log(`🔄 Retrying onboarding check due to error (attempt ${retryCountRef.current + 1}/3)...`);
        setTimeout(() => {
          retryCountRef.current += 1;
          checkOnboardingStatus();
        }, 500);
        return;
      }
      
      console.log('❌ Onboarding check failed after error retries, setting to false');
      setHasCompletedOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, subscription.isActive]);

  useEffect(() => {
    console.log('🔄 Onboarding status effect triggered:', {
      isAuthenticated,
      userId: user?.id,
      isPro,
      subscriptionActive: subscription.isActive
    });
    
    // Add debounce to prevent excessive calls
    const timeoutId = setTimeout(() => {
      retryCountRef.current = 0;
      checkOnboardingStatus();
    }, 100); // 100ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, user?.id]);

  // Enhanced timeout protection to prevent long loading states
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('⚠️ Onboarding status check timeout - forcing completion');
        setIsLoading(false);
        setHasCompletedOnboarding(false);
      }
    }, 3000); // Increased from 2000ms to 3000ms for better reliability

    return () => clearTimeout(timeout);
  }, [isLoading]);

  // Additional timeout for overall loading state
  useEffect(() => {
    const overallTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn('⚠️ Overall onboarding loading timeout - forcing decision');
        setIsLoading(false);
        // If we have a user but no onboarding data, assume not completed
        setHasCompletedOnboarding(false);
      }
    }, 8000); // 8 second overall timeout

    return () => clearTimeout(overallTimeout);
  }, [isLoading, user]);

  return {
    isLoading,
    hasCompletedOnboarding,
    checkOnboardingStatus,
    retryCount: retryCountRef.current
  };
} 