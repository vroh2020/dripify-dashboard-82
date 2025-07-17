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
  const [deviceId, setDeviceId] = useState<string | null>(null);
  
  // Add state tracking to prevent loops
  const lastCheckRef = useRef<{
    userId: string | null;
    timestamp: number;
    result: boolean;
  }>({ userId: null, timestamp: 0, result: false });

  useEffect(() => {
    // Get device ID for guest mode
    import('@capacitor/device').then(({ Device }) => {
      Device.getId().then(info => setDeviceId(info.identifier));
    });
  }, []);

  const checkOnboardingStatus = useCallback(async () => {
    if (isAuthenticated && user?.id) {
      // Authenticated user: check profiles table
      if (!isAuthenticated || !user?.id) {
        setIsLoading(false);
        setHasCompletedOnboarding(false);
        return;
      }

      // Prevent rapid successive checks
      const now = Date.now();
      const lastCheck = lastCheckRef.current;
      if (lastCheck.userId === user.id && now - lastCheck.timestamp < 1000) {
        console.log('🔄 Skipping rapid onboarding check');
        return;
      }

      try {
        setIsLoading(true);
        
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
        
        console.log('📊 Onboarding Status Check:', {
          userId: user.id,
          onboardingCompleted,
          platform: Capacitor.isNativePlatform() ? 'native' : 'web',
          revenueCatStatus: subscription.isActive,
          supabaseStatus: profile?.subscription_status,
          finalResult: onboardingCompleted,
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
    } else if (deviceId) {
      // Guest/anonymous: check temp_onboard_users by device_id
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from<any, any>('temp_onboard_users')
          .select('completed')
          .eq('device_id', deviceId)
          .maybeSingle();
        if (error) throw error;
        let completed = false;
        if (data !== null && typeof data === 'object' && !('code' in data) && 'completed' in data) {
          completed = (data as any).completed;
        }
        setHasCompletedOnboarding(completed === true);
      } catch (error) {
        setHasCompletedOnboarding(false);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
      setHasCompletedOnboarding(false);
    }
  }, [isAuthenticated, user?.id, deviceId, retryCount, subscription.isActive]);

  useEffect(() => {
    setRetryCount(0);
    checkOnboardingStatus();
  }, [isAuthenticated, user?.id, deviceId]);

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
    retryCount
  };
} 