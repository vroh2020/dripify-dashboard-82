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
  const lastCheckRef = useRef<{
    userId: string | null;
    timestamp: number;
    result: boolean;
  }>({ userId: null, timestamp: 0, result: false });

  const checkOnboardingStatus = useCallback(async () => {
    // Prevent rapid successive checks
    if (isCheckingRef.current) {
      console.log('🔄 Onboarding check already in progress, skipping');
      return;
    }

    const now = Date.now();
    const currentUserId = user?.id || null;
    const lastCheck = lastCheckRef.current;
    
    // Skip if we checked recently for the same user
    if (lastCheck.userId === currentUserId && now - lastCheck.timestamp < 2000) {
      console.log('🔄 Skipping rapid onboarding check for same user');
      return;
    }

    isCheckingRef.current = true;
    setIsLoading(true);

    try {
      console.log('🔍 Starting onboarding status check...', {
        userId: currentUserId,
        isAuthenticated,
        platform: Capacitor.isNativePlatform() ? 'native' : 'web'
      });

      let onboardingCompleted = false;

      // Step 1: Check localStorage first (fastest)
      const cachedCompletion = await persistenceManager.isOnboardingCompleted();
      if (cachedCompletion) {
        console.log('📊 Using cached onboarding completion status');
        setHasCompletedOnboarding(true);
        setIsLoading(false);
        isCheckingRef.current = false;
        return;
      }

      // Step 2: Check for in-progress onboarding
      const progress = await persistenceManager.getOnboardingProgress();
      if (progress && !progress.completed && progress.currentStep > 0) {
        console.log('📊 Found in-progress onboarding at step:', progress.currentStep);
        setHasCompletedOnboarding(false);
        setIsLoading(false);
        isCheckingRef.current = false;
        return;
      }

      // Step 3: Check database for authenticated users
      if (isAuthenticated && user?.id) {
        console.log('🔍 Checking database for authenticated user:', user.id);
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('onboarding_completed, subscription_status')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Database onboarding check error:', error);
          
          // Only retry for network errors, not permission issues
          if (error.code === 'PGRST301' && retryCount < 2) {
            console.log('🔄 Retrying database check due to network error');
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              isCheckingRef.current = false;
              checkOnboardingStatus();
            }, 1000);
            return;
          }
          
          // For other errors, assume not completed
          onboardingCompleted = false;
        } else {
          onboardingCompleted = profile?.onboarding_completed === true;
          
          console.log('📊 Database onboarding status:', {
            userId: user.id,
            onboardingCompleted,
            profileData: profile
          });
        }
      } else {
        // Step 4: Check database for guest users
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
      }
      
      // Update last check tracking
      lastCheckRef.current = {
        userId: currentUserId,
        timestamp: now,
        result: onboardingCompleted
      };
      
      console.log('📊 Final onboarding status:', {
        userId: currentUserId,
        onboardingCompleted,
        platform: Capacitor.isNativePlatform() ? 'native' : 'web',
        retryCount
      });

      setHasCompletedOnboarding(onboardingCompleted);
      setRetryCount(0);
      
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      
      // Only retry for network-related errors
      if (retryCount < 2 && error instanceof Error && 
          (error.message.includes('network') || error.message.includes('fetch'))) {
        console.log('🔄 Retrying due to network error');
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          isCheckingRef.current = false;
          checkOnboardingStatus();
        }, 1000);
        return;
      }
      
      // For other errors, assume not completed
      setHasCompletedOnboarding(false);
      setRetryCount(0);
    } finally {
      setIsLoading(false);
      isCheckingRef.current = false;
    }
  }, [isAuthenticated, user?.id, retryCount, subscription.isActive]);

  // Initialize persistence manager and check status
  useEffect(() => {
    const initializeAndCheck = async () => {
      try {
        await persistenceManager.initialize();
        await checkOnboardingStatus();
      } catch (error) {
        console.error('Error initializing onboarding status:', error);
        setIsLoading(false);
      }
    };

    initializeAndCheck();
  }, []);

  // Re-check when auth state changes
  useEffect(() => {
    if (!isLoading) {
      checkOnboardingStatus();
    }
  }, [isAuthenticated, user?.id]);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('⚠️ Onboarding status check timeout - forcing completion');
        setIsLoading(false);
        setHasCompletedOnboarding(false);
        isCheckingRef.current = false;
      }
    }, 8000); // Increased timeout

    return () => clearTimeout(timeout);
  }, [isLoading]);

  return {
    isLoading,
    hasCompletedOnboarding,
    checkOnboardingStatus,
    retryCount
  };
} 