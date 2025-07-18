import { useState, useEffect, useCallback } from 'react';
import { persistenceManager } from '@/utils/persistenceManager';
import { useSubscription } from '@/components/subscription/SubscriptionProvider';
import { useAuth } from '@/hooks/useAuth';

interface StrategicPromptState {
  showAppleSignIn: boolean;
  showUpgradePrompt: boolean;
  appleSignInTrigger: 'onboarding' | 'paywall' | 'completion' | 'reinstall' | null;
  upgradePromptTrigger: 'analysis_complete' | 'onboarding_midway' | 'paywall' | 'feature_limit' | null;
  userProgress: {
    stepsCompleted: number;
    timeSpent: number;
    hasPhoto: boolean;
    analysisCount: number;
    featuresUsed: string[];
  };
}

export const useStrategicPrompts = () => {
  const [promptState, setPromptState] = useState<StrategicPromptState>({
    showAppleSignIn: false,
    showUpgradePrompt: false,
    appleSignInTrigger: null,
    upgradePromptTrigger: null,
    userProgress: {
      stepsCompleted: 0,
      timeSpent: 0,
      hasPhoto: false,
      analysisCount: 0,
      featuresUsed: []
    }
  });

  const { user } = useAuth();
  const { isSubscribed } = useSubscription();

  // Track user progress and behavior
  const updateUserProgress = useCallback(async () => {
    try {
      const deviceInfo = persistenceManager.getDeviceInfo();
      const onboardingProgress = await persistenceManager.getOnboardingProgress();
      
      // Calculate time spent (simplified - in real app you'd track this more precisely)
      const startTime = deviceInfo?.createdAt ? new Date(deviceInfo.createdAt).getTime() : Date.now();
      const timeSpent = Math.floor((Date.now() - startTime) / 1000 / 60); // minutes
      
      // Get analysis count from localStorage or other tracking
      const analysisCount = parseInt(localStorage.getItem('analysisCount') || '0');
      
      // Track features used
      const featuresUsed = JSON.parse(localStorage.getItem('featuresUsed') || '[]');
      
      setPromptState(prev => ({
        ...prev,
        userProgress: {
          stepsCompleted: onboardingProgress?.currentStep || 0,
          timeSpent,
          hasPhoto: !!onboardingProgress?.stepData?.selfie_url,
          analysisCount,
          featuresUsed
        }
      }));
    } catch (error) {
      console.error('Error updating user progress:', error);
    }
  }, []);

  // Strategic logic for when to show prompts
  const evaluatePrompts = useCallback(() => {
    const { userProgress } = promptState;
    
    // Don't show prompts if user is already subscribed or authenticated
    if (isSubscribed || user) {
      return;
    }

    // Apple Sign-in triggers
    let appleSignInTrigger: StrategicPromptState['appleSignInTrigger'] = null;
    
    // Show during onboarding if user has made significant progress
    if (userProgress.stepsCompleted >= 5 && userProgress.stepsCompleted < 10) {
      appleSignInTrigger = 'onboarding';
    }
    // Show at paywall
    else if (userProgress.stepsCompleted >= 10) {
      appleSignInTrigger = 'paywall';
    }
    // Show at completion
    else if (userProgress.stepsCompleted >= 15) {
      appleSignInTrigger = 'completion';
    }

    // Upgrade prompt triggers
    let upgradePromptTrigger: StrategicPromptState['upgradePromptTrigger'] = null;
    
    // Show after first analysis
    if (userProgress.analysisCount === 1) {
      upgradePromptTrigger = 'analysis_complete';
    }
    // Show midway through onboarding
    else if (userProgress.stepsCompleted >= 7 && userProgress.stepsCompleted < 12) {
      upgradePromptTrigger = 'onboarding_midway';
    }
    // Show at paywall
    else if (userProgress.stepsCompleted >= 12) {
      upgradePromptTrigger = 'paywall';
    }
    // Show when hitting feature limits
    else if (userProgress.analysisCount >= 3) {
      upgradePromptTrigger = 'feature_limit';
    }

    setPromptState(prev => ({
      ...prev,
      appleSignInTrigger,
      upgradePromptTrigger
    }));
  }, [promptState.userProgress, isSubscribed, user]);

  // Show Apple Sign-in prompt
  const showAppleSignIn = useCallback((trigger: StrategicPromptState['appleSignInTrigger']) => {
    setPromptState(prev => ({
      ...prev,
      showAppleSignIn: true,
      appleSignInTrigger: trigger
    }));
  }, []);

  // Hide Apple Sign-in prompt
  const hideAppleSignIn = useCallback(() => {
    setPromptState(prev => ({
      ...prev,
      showAppleSignIn: false,
      appleSignInTrigger: null
    }));
  }, []);

  // Show upgrade prompt
  const showUpgradePrompt = useCallback((trigger: StrategicPromptState['upgradePromptTrigger']) => {
    setPromptState(prev => ({
      ...prev,
      showUpgradePrompt: true,
      upgradePromptTrigger: trigger
    }));
  }, []);

  // Hide upgrade prompt
  const hideUpgradePrompt = useCallback(() => {
    setPromptState(prev => ({
      ...prev,
      showUpgradePrompt: false,
      upgradePromptTrigger: null
    }));
  }, []);

  // Track feature usage
  const trackFeatureUsage = useCallback((feature: string) => {
    const featuresUsed = JSON.parse(localStorage.getItem('featuresUsed') || '[]');
    if (!featuresUsed.includes(feature)) {
      featuresUsed.push(feature);
      localStorage.setItem('featuresUsed', JSON.stringify(featuresUsed));
      updateUserProgress();
    }
  }, [updateUserProgress]);

  // Track analysis count
  const trackAnalysis = useCallback(() => {
    const currentCount = parseInt(localStorage.getItem('analysisCount') || '0');
    const newCount = currentCount + 1;
    localStorage.setItem('analysisCount', newCount.toString());
    updateUserProgress();
  }, [updateUserProgress]);

  // Auto-evaluate prompts when user progress changes
  useEffect(() => {
    updateUserProgress();
  }, [updateUserProgress]);

  useEffect(() => {
    evaluatePrompts();
  }, [evaluatePrompts]);

  // Strategic timing for prompts
  useEffect(() => {
    const { userProgress, appleSignInTrigger, upgradePromptTrigger } = promptState;
    
    // Auto-show Apple Sign-in at strategic moments
    if (appleSignInTrigger && !promptState.showAppleSignIn) {
      // Delay to avoid overwhelming user
      const timer = setTimeout(() => {
        showAppleSignIn(appleSignInTrigger);
      }, 2000); // 2 second delay
      
      return () => clearTimeout(timer);
    }
    
    // Auto-show upgrade prompt at strategic moments
    if (upgradePromptTrigger && !promptState.showUpgradePrompt) {
      // Different delays based on trigger
      let delay = 3000; // default 3 seconds
      
      if (upgradePromptTrigger === 'analysis_complete') {
        delay = 1500; // Show quickly after analysis
      } else if (upgradePromptTrigger === 'onboarding_midway') {
        delay = 4000; // Give more time during onboarding
      }
      
      const timer = setTimeout(() => {
        showUpgradePrompt(upgradePromptTrigger);
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [promptState.appleSignInTrigger, promptState.upgradePromptTrigger, promptState.showAppleSignIn, promptState.showUpgradePrompt, showAppleSignIn, showUpgradePrompt]);

  return {
    ...promptState,
    showAppleSignIn,
    hideAppleSignIn,
    showUpgradePrompt,
    hideUpgradePrompt,
    trackFeatureUsage,
    trackAnalysis,
    updateUserProgress
  };
};