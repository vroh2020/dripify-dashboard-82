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
    deviceId: string | null;
    timestamp: number;
    result: boolean;
  }>({ userId: null, deviceId: null, timestamp: 0, result: false });

  // Cache onboarding status in localStorage to prevent going back to start
  const getCachedOnboardingStatus = () => {
    try {
      const cached = localStorage.getItem('dripify_onboarding_completed');
      return cached === 'true';
    } catch (error) {
      console.error('Error reading cached onboarding status:', error);
      return false;
    }
  };

  const setCachedOnboardingStatus = (completed: boolean) => {
    try {
      localStorage.setItem('dripify_onboarding_completed', completed.toString());
    } catch (error) {
      console.error('Error caching onboarding status:', error);
    }
  };

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
    // Prevent rapid successive checks
    const now = Date.now();
    const lastCheck = lastCheckRef.current;
    const currentUserId = user?.id || null;
    const currentDeviceId = deviceId;
    
    if (lastCheck.userId === currentUserId && 
        lastCheck.deviceId === currentDeviceId && 
        now - lastCheck.timestamp < 1000) {
      console.log('🔄 Skipping rapid onboarding check');
      return;
    }

    try {
      setIsLoading(true);
      let onboardingCompleted = false;

      // First check localStorage as the source of truth
      const cachedStatus = getCachedOnboardingStatus();
      if (cachedStatus) {
        console.log('📊 Using localStorage onboarding status: completed');
        setHasCompletedOnboarding(true);
        setIsLoading(false);
        return;
      }

      // Check for cached progress to prevent going back to start
      try {
        const cachedProgress = localStorage.getItem('dripify_onboarding_progress');
        if (cachedProgress) {
          const progress = JSON.parse(cachedProgress);
          const progressAge = now - progress.timestamp;
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          
          if (progressAge < maxAge && progress.currentStep > 0) {
            console.log('📊 Found recent onboarding progress, not completed yet');
            setHasCompletedOnboarding(false);
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking cached progress:', error);
      }

      if (isAuthenticated && user?.id) {
        // Authenticated user: check profiles table
        console.log('🔍 Checking onboarding for authenticated user:', user.id);
        
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

        onboardingCompleted = profile?.onboarding_completed === true;
        
        console.log('📊 Authenticated User Onboarding Status:', {
          userId: user.id,
          onboardingCompleted,
          profileData: profile,
          platform: Capacitor.isNativePlatform() ? 'native' : 'web',
          revenueCatStatus: subscription.isActive,
          supabaseStatus: profile?.subscription_status
        });
        
      } else if (deviceId) {
        // Guest/anonymous: check temp_onboard_users by device_id
        console.log('🔍 Checking onboarding for guest user:', deviceId);
        
        const { data, error } = await supabase
          .from('temp_onboard_users')
          .select('completed, onboarding_step')
          .eq('device_id', deviceId)
          .maybeSingle();
          
        if (error) {
          console.error('Guest onboarding check error:', error);
          onboardingCompleted = false;
        } else {
          onboardingCompleted = data?.completed === true;
          
          console.log('📊 Guest User Onboarding Status:', {
            deviceId,
            onboardingCompleted,
            onboardingStep: data?.onboarding_step,
            platform: Capacitor.isNativePlatform() ? 'native' : 'web'
          });
        }
      } else {
        // No device ID yet, assume not completed
        onboardingCompleted = false;
        console.log('🔍 No device ID available, assuming onboarding not completed');
      }
      
      // Only cache if onboarding is completed
      if (onboardingCompleted) {
        setCachedOnboardingStatus(onboardingCompleted);
      }
      
      // Update last check tracking
      lastCheckRef.current = {
        userId: currentUserId,
        deviceId: currentDeviceId,
        timestamp: now,
        result: onboardingCompleted
      };
      
      console.log('📊 Final Onboarding Status Check:', {
        userId: currentUserId,
        deviceId: currentDeviceId,
        onboardingCompleted,
        platform: Capacitor.isNativePlatform() ? 'native' : 'web',
        revenueCatStatus: subscription.isActive,
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