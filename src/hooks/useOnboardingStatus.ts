import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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
  
  // Add state tracking to prevent loops
  const lastCheckRef = useRef<{
    userId: string | null;
    timestamp: number;
    result: boolean;
  }>({ userId: null, timestamp: 0, result: false });

  const checkOnboardingStatus = useCallback(async () => {
    // In premium-only model, onboarding is complete when user is authenticated
    if (isAuthenticated && user?.id) {
      // Prevent rapid successive checks
      const now = Date.now();
      const lastCheck = lastCheckRef.current;
      if (lastCheck.userId === user.id && now - lastCheck.timestamp < 1000) {
        console.log('🔄 Skipping rapid onboarding check');
        return;
      }

      try {
        setIsLoading(true);
        
        // Premium user: check profiles table
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
        
        // Update last check tracking
        lastCheckRef.current = {
          userId: user.id,
          timestamp: now,
          result: onboardingCompleted
        };
        
        console.log('📊 Premium User Onboarding Status:', {
          userId: user.id,
          onboardingCompleted,
          subscriptionStatus: profile?.subscription_status,
          retryCount,
          timestamp: new Date().toISOString()
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
    } else {
      // No user = still in onboarding
      setIsLoading(false);
      setHasCompletedOnboarding(false);
    }
  }, [isAuthenticated, user?.id, retryCount]);

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
    }, 5000);

    return () => clearTimeout(timeout);
  }, [isLoading]);

  return {
    isLoading,
    hasCompletedOnboarding,
    checkOnboardingStatus,
    retryCount
  };
} 