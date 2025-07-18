import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSubscription } from '@/components/subscription/SubscriptionProvider';
import { Capacitor } from '@capacitor/core';
import { persistenceManager } from '@/utils/persistenceManager';

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
  
  // Prevent multiple simultaneous checks
  const isCheckingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const checkOnboardingStatus = useCallback(async () => {
    // Prevent rapid successive checks
    if (isCheckingRef.current) {
      console.log('🔄 Onboarding check already in progress, skipping');
      return;
    }

    isCheckingRef.current = true;
    setIsLoading(true);

    try {
      console.log('🔍 Starting onboarding status check...', {
        userId: user?.id || 'NO_USER',
        isAuthenticated,
        platform: Capacitor.isNativePlatform() ? 'native' : 'web'
      });

      let onboardingCompleted = false;

      // Step 1: Check localStorage first (fastest)
      try {
        const cachedCompletion = await persistenceManager.isOnboardingCompleted();
        if (cachedCompletion) {
          console.log('📊 Using cached onboarding completion status');
          setHasCompletedOnboarding(true);
          setIsLoading(false);
          isCheckingRef.current = false;
          return;
        }
      } catch (error) {
        console.error('Error checking cached completion:', error);
      }

      // Step 2: Check for in-progress onboarding
      try {
        const progress = await persistenceManager.getOnboardingProgress();
        if (progress && !progress.completed && progress.currentStep > 0) {
          console.log('📊 Found in-progress onboarding at step:', progress.currentStep);
          setHasCompletedOnboarding(false);
          setIsLoading(false);
          isCheckingRef.current = false;
          return;
        }
      } catch (error) {
        console.error('Error checking progress:', error);
      }

      // Step 3: Check database for authenticated users
      if (isAuthenticated && user?.id) {
        console.log('🔍 Checking database for authenticated user:', user.id);
        
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('onboarding_completed, subscription_status')
            .eq('id', user.id)
            .maybeSingle();

          if (error) {
            console.error('Database onboarding check error:', error);
            onboardingCompleted = false;
          } else {
            onboardingCompleted = profile?.onboarding_completed === true;
            
            console.log('📊 Database onboarding status:', {
              userId: user.id,
              onboardingCompleted,
              profileData: profile
            });
          }
        } catch (error) {
          console.error('Error checking database:', error);
          onboardingCompleted = false;
        }
      } else {
        // Step 4: Check database for guest users
        try {
          const deviceInfo = persistenceManager.getDeviceInfo();
          if (deviceInfo?.deviceId) {
            console.log('🔍 Checking database for guest user:', deviceInfo.deviceId);
            
            const { data, error } = await supabase
              .from('temp_onboard_users')
              .select('completed, onboarding_step')
              .eq('device_id', deviceInfo.deviceId)
              .maybeSingle();
              
            if (error) {
              console.error('Guest database check error:', error);
              onboardingCompleted = false;
            } else {
              onboardingCompleted = data?.completed === true;
              
              console.log('📊 Guest database onboarding status:', {
                deviceId: deviceInfo.deviceId,
                onboardingCompleted,
                onboardingStep: data?.onboarding_step
              });
            }
          } else {
            // No device info yet, assume not completed
            onboardingCompleted = false;
            console.log('🔍 No device info available, assuming onboarding not completed');
          }
        } catch (error) {
          console.error('Error checking guest database:', error);
          onboardingCompleted = false;
        }
      }
      
      console.log('📊 Final onboarding status:', {
        userId: user?.id || 'NO_USER',
        onboardingCompleted,
        platform: Capacitor.isNativePlatform() ? 'native' : 'web'
      });

      setHasCompletedOnboarding(onboardingCompleted);
      setRetryCount(0);
      
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      
      // For any error, assume not completed and continue
      setHasCompletedOnboarding(false);
      setRetryCount(0);
    } finally {
      setIsLoading(false);
      isCheckingRef.current = false;
    }
  }, [isAuthenticated, user?.id, subscription.isActive]);

  // Initialize persistence manager and check status (only once)
  useEffect(() => {
    if (hasInitializedRef.current) return;
    
    const initializeAndCheck = async () => {
      try {
        console.log('🚀 Initializing onboarding status...');
        await persistenceManager.initialize();
        await checkOnboardingStatus();
        hasInitializedRef.current = true;
      } catch (error) {
        console.error('Error initializing onboarding status:', error);
        // Even if initialization fails, set loading to false
        setIsLoading(false);
        setHasCompletedOnboarding(false);
        hasInitializedRef.current = true;
      }
    };

    initializeAndCheck();
  }, []);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('⚠️ Onboarding status check timeout - forcing completion');
        setIsLoading(false);
        setHasCompletedOnboarding(false);
        isCheckingRef.current = false;
        hasInitializedRef.current = true;
      }
    }, 5000); // Reduced timeout

    return () => clearTimeout(timeout);
  }, [isLoading]);

  return {
    isLoading,
    hasCompletedOnboarding,
    checkOnboardingStatus,
    retryCount
  };
} 