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

export function useOnboardingStatus(): OnboardingStatus & { refetch: () => Promise<void> } {
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { isAuthenticated, user } = useAuth();
  const { isPro, subscription } = useSubscription();
  
  // Add state tracking to prevent loops
  const lastCheckRef = useRef<{
    userId: string | null;
    timestamp: number;
    result: boolean;
  }>({ userId: null, timestamp: 0, result: false });

  const checkOnboardingStatus = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setIsLoading(false);
      setHasCompletedOnboarding(false);
      return;
    }

    // Prevent rapid successive checks
    const now = Date.now();
    const lastCheck = lastCheckRef.current;
    if (lastCheck.userId === user.id && now - lastCheck.timestamp < 2000) { // Increased to 2s
      console.log('🔄 Skipping rapid onboarding check');
      setIsLoading(false); // Ensure loading stops
      return;
    }

    try {
      setIsLoading(true);
      
      // Use a single query with error handling
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single(); // Use single() instead of maybeSingle()

      if (error) {
        console.error('Onboarding check error:', error);
        // Defensive: If profile is missing (PGRST116), force logout and redirect
        if (error.code === 'PGRST116') {
          await supabase.auth.signOut();
          localStorage.clear();
          sessionStorage.clear();
          setTimeout(() => {
            window.location.href = '/auth';
          }, 300);
          return;
        }
        // Only retry on network errors, not data errors
        if (error.code !== 'PGRST116' && retryCount < 2) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            checkOnboardingStatus();
          }, 1000);
          return;
        }
        
        // Assume not completed on persistent errors
        setHasCompletedOnboarding(false);
        setIsLoading(false);
        return;
      }

      const onboardingCompleted = profile?.onboarding_completed === true;
      
      // Update tracking BEFORE state to prevent loops
      lastCheckRef.current = {
        userId: user.id,
        timestamp: now,
        result: onboardingCompleted
      };
      
      console.log('📊 Onboarding Status:', {
        userId: user.id,
        completed: onboardingCompleted,
        timestamp: new Date().toISOString().substr(11, 8) // Just time, not full timestamp
      });

      setHasCompletedOnboarding(onboardingCompleted);
      setRetryCount(0);
      
    } catch (error) {
      console.error('Error checking onboarding:', error);
      setHasCompletedOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, retryCount]); // Removed subscription.isActive

  const refetch = useCallback(async () => {
    console.log('[useOnboardingStatus] Manual refetch called');
    await checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  // REPLACE this effect:
  useEffect(() => {
    setRetryCount(0);
    checkOnboardingStatus();
  }, [isAuthenticated, user?.id]); // REMOVED extra dependencies that caused loops

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('⚠️ Onboarding status check timeout - forcing completion');
        setIsLoading(false);
        setHasCompletedOnboarding(false);
      }
    }, 5000); // Increased from 3s to 5s

    return () => clearTimeout(timeout);
  }, [isLoading]);

  return {
    isLoading,
    hasCompletedOnboarding,
    checkOnboardingStatus,
    retryCount,
    refetch
  };
} 