import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Capacitor } from '@capacitor/core';

interface OnboardingStatus {
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  userType: 'free' | 'premium' | null;
  checkOnboardingStatus: () => Promise<void>;
  retryCount: number;
}

export function useOnboardingStatus(): OnboardingStatus {
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [userType, setUserType] = useState<'free' | 'premium' | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { isAuthenticated, user } = useAuth();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  
  // Add state tracking to prevent loops
  const lastCheckRef = useRef<{
    userId: string | null;
    deviceId: string | null;
    timestamp: number;
    result: boolean;
  }>({ userId: null, deviceId: null, timestamp: 0, result: false });

  useEffect(() => {
    // Get device ID for guest mode
    import('@capacitor/device').then(({ Device }) => {
      Device.getId().then(info => setDeviceId(info.identifier));
    }).catch(() => {
      // Fallback for web
      setDeviceId('web-fallback-' + Date.now());
    });
  }, []);

  const checkOnboardingStatus = useCallback(async () => {
    if (!deviceId) {
      setIsLoading(false);
      return;
    }

    // Prevent rapid successive checks
    const now = Date.now();
    const lastCheck = lastCheckRef.current;
    const checkKey = user?.id || deviceId;
    if (lastCheck.userId === checkKey && now - lastCheck.timestamp < 1000) {
      console.log('🔄 Skipping rapid onboarding check');
      return;
    }

    try {
      setIsLoading(true);
      
      if (isAuthenticated && user?.id) {
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
          setUserType(null);
          setIsLoading(false);
          return;
        }

        const onboardingCompleted = profile?.onboarding_completed === true;
        const userTypeValue = profile?.subscription_status === 'active' ? 'premium' : 'free';
        
        // Update last check tracking
        lastCheckRef.current = {
          userId: user.id,
          deviceId,
          timestamp: now,
          result: onboardingCompleted
        };
        
        console.log('📊 Premium User Onboarding Status:', {
          userId: user.id,
          onboardingCompleted,
          subscriptionStatus: profile?.subscription_status,
          userType: userTypeValue,
          retryCount,
          timestamp: new Date().toISOString()
        });

        setHasCompletedOnboarding(onboardingCompleted);
        setUserType(userTypeValue);
        setRetryCount(0);
        
      } else {
        // Free/Guest user: check temp_onboard_users table
        const { data: tempUser, error } = await supabase
          .from('temp_onboard_users')
          .select('completed, user_type')
          .eq('device_id', deviceId)
          .maybeSingle();

        if (error) {
          console.error('Temp user check error:', error);
          setHasCompletedOnboarding(false);
          setUserType(null);
        } else {
          const completed = tempUser?.completed === true;
          const userTypeValue = tempUser?.user_type || null;
          
          console.log('📊 Free User Onboarding Status:', {
            deviceId,
            completed,
            userType: userTypeValue,
            tempUserData: tempUser,
            timestamp: new Date().toISOString()
          });
          
          setHasCompletedOnboarding(completed);
          setUserType(userTypeValue as 'free' | 'premium' | null);
        }
      }
      
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
      setUserType(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, deviceId, retryCount]);

  useEffect(() => {
    setRetryCount(0);
    if (deviceId) {
      checkOnboardingStatus();
    }
  }, [isAuthenticated, user?.id, deviceId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('⚠️ Onboarding status check timeout - forcing completion');
        setIsLoading(false);
        setHasCompletedOnboarding(false);
        setUserType(null);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [isLoading]);

  return {
    isLoading,
    hasCompletedOnboarding,
    userType,
    checkOnboardingStatus,
    retryCount
  };
} 