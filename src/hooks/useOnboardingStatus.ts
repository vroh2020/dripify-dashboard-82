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
  const [retryCount, setRetryCount] = useState(0);
  const { isAuthenticated, user } = useAuth();
  const { isPro, subscription } = useSubscription();

  // CRITICAL FIX: Add debouncing and prevent excessive checks
  const lastCheckRef = useRef<string>('');
  const isCheckingRef = useRef(false);
  const mountedRef = useRef(true);

  const checkOnboardingStatus = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      console.log('🔍 Onboarding check: User not authenticated, setting to false');
      setIsLoading(false);
      setHasCompletedOnboarding(false);
      return;
    }

    // CRITICAL FIX: Prevent duplicate checks for same user/subscription state
    const checkKey = `${user.id}-${subscription.isActive}-${isPro}`;
    if (lastCheckRef.current === checkKey && !isCheckingRef.current) {
      console.log('🔄 Skipping duplicate onboarding check for:', checkKey);
      return;
    }

    // Prevent concurrent checks
    if (isCheckingRef.current) {
      console.log('🔄 Onboarding check already in progress, skipping');
      return;
    }

    try {
      isCheckingRef.current = true;
      setIsLoading(true);
      console.log('🔍 Checking onboarding status for user:', user.id);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, subscription_status')
        .eq('id', user.id)
        .maybeSingle();

      if (!mountedRef.current) return;

      if (error) {
        console.error('Onboarding check error:', error);
        
        if (retryCount < 2) {
          console.log(`🔄 Retrying onboarding check (attempt ${retryCount + 1}/3)...`);
          setTimeout(() => {
            if (mountedRef.current) {
              setRetryCount(prev => prev + 1);
              checkOnboardingStatus();
            }
          }, 1000 * (retryCount + 1)); // Exponential backoff: 1s, 2s
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
      setRetryCount(0);
      lastCheckRef.current = checkKey; // Mark this check as completed
      
    } catch (error) {
      if (!mountedRef.current) return;
      
      console.error('Error checking onboarding:', error);
      
      if (retryCount < 2) {
        console.log(`🔄 Retrying onboarding check due to error (attempt ${retryCount + 1}/3)...`);
        setTimeout(() => {
          if (mountedRef.current) {
            setRetryCount(prev => prev + 1);
            checkOnboardingStatus();
          }
        }, 1000 * (retryCount + 1));
        return;
      }
      
      console.log('❌ Onboarding check failed after error retries, setting to false');
      setHasCompletedOnboarding(false);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        isCheckingRef.current = false;
      }
    }
  }, [isAuthenticated, user?.id, isPro, subscription.isActive, retryCount]);

  // CRITICAL FIX: Debounced effect to prevent rapid re-checks
  useEffect(() => {
    console.log('🔄 Onboarding status effect triggered:', {
      isAuthenticated,
      userId: user?.id,
      isPro,
      subscriptionActive: subscription.isActive
    });
    
    // Reset retry count on auth/user changes
    setRetryCount(0);
    
    // CRITICAL FIX: Debounce the check to prevent rapid firing
    const timeoutId = setTimeout(() => {
      if (mountedRef.current) {
        checkOnboardingStatus();
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, user?.id]); // CRITICAL FIX: Removed isPro and subscription.isActive from deps to reduce triggers

  // Separate effect for subscription changes with longer debounce
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    
    const timeoutId = setTimeout(() => {
      if (mountedRef.current) {
        console.log('🔄 Subscription state changed, re-checking onboarding...');
        lastCheckRef.current = ''; // Force a new check
        checkOnboardingStatus();
      }
    }, 1000); // 1 second debounce for subscription changes
    
    return () => clearTimeout(timeoutId);
  }, [isPro, subscription.isActive]); // Only subscription-related deps

  // Enhanced timeout protection to prevent long loading states
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading && mountedRef.current) {
        console.warn('⚠️ Onboarding status check timeout - forcing completion');
        setIsLoading(false);
        setHasCompletedOnboarding(false);
      }
    }, 5000); // Reduced from 8000ms to 5000ms

    return () => clearTimeout(timeout);
  }, [isLoading]);

  // Component cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      isCheckingRef.current = false;
    };
  }, []);

  return {
    isLoading,
    hasCompletedOnboarding,
    checkOnboardingStatus,
    retryCount
  };
} 