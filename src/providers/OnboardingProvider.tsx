import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { useProfile } from './ProfileProvider';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type OnboardingStep = 
  | 'welcome'
  | 'shopping-frequency'
  | 'budget-range'
  | 'style-preferences'
  | 'body-type'
  | 'fit-preference'
  | 'color-palette'
  | 'shoe-size'
  | 'brand-affinity'
  | 'inspiration-link'
  | 'main-goal'
  | 'test-photo'
  | 'celebration'
  | 'paywall'
  | 'completed';

export interface OnboardingData {
  // Step 1: Welcome (no data)
  
  // Step 2: Shopping Frequency
  shoppingFrequency?: string;
  
  // Step 3: Budget Range
  budgetRange?: string;
  
  // Step 4: Style Preferences
  stylePreferences?: string[];
  
  // Step 5: Body Type
  bodyType?: string;
  
  // Step 6: Fit Preference
  fitPreference?: string;
  
  // Step 7: Color Palette
  colorPalette?: string[];
  
  // Step 8: Shoe Size
  shoeSize?: string;
  
  // Step 9: Brand Affinity
  brandAffinity?: string[];
  
  // Step 10: Inspiration Link
  inspirationLink?: string;
  
  // Step 11: Main Goal
  mainGoal?: string;
  
  // Step 12: Test Photo
  testPhotoUrl?: string;
}

interface OnboardingState {
  // Flow Control
  currentStep: OnboardingStep;
  totalSteps: number;
  
  // Data
  data: OnboardingData;
  
  // Status
  isCompleted: boolean;
  isLoading: boolean;
  isSaving: boolean;
  
  // Progress
  completedSteps: OnboardingStep[];
  progress: number; // 0-100
  
  // Error Handling
  error: string | null;
  validationErrors: Record<string, string>;
}

interface OnboardingActions {
  // Flow Control
  goToStep: (step: OnboardingStep) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  skipToStep: (step: OnboardingStep) => Promise<boolean>;
  
  // Data Management
  setStepData: <K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) => void;
  saveStepData: (stepData: Partial<OnboardingData>) => Promise<boolean>;
  saveAndAdvance: (stepData: Partial<OnboardingData>) => Promise<boolean>;
  
  // Completion
  completeOnboarding: () => Promise<boolean>;
  resetOnboarding: () => Promise<boolean>;
  
  // Validation
  validateCurrentStep: () => boolean;
  getStepErrors: (step?: OnboardingStep) => string[];
  
  // Utility
  isStepCompleted: (step: OnboardingStep) => boolean;
  canAdvanceToStep: (step: OnboardingStep) => boolean;
  clearError: () => void;
}

type OnboardingContextType = OnboardingState & OnboardingActions;

// ============================================================================
// Constants
// ============================================================================

const ONBOARDING_STEPS: OnboardingStep[] = [
  'welcome',
  'shopping-frequency',
  'budget-range',
  'style-preferences',
  'body-type',
  'fit-preference',
  'color-palette',
  'shoe-size',
  'brand-affinity',
  'inspiration-link',
  'main-goal',
  'test-photo',
  'celebration',
  'paywall',
  'completed',
];

const STEP_VALIDATION_RULES: Record<OnboardingStep, (data: OnboardingData) => string[]> = {
  'welcome': () => [],
  'shopping-frequency': (data) => data.shoppingFrequency ? [] : ['Please select shopping frequency'],
  'budget-range': (data) => data.budgetRange ? [] : ['Please select budget range'],
  'style-preferences': (data) => data.stylePreferences?.length ? [] : ['Please select at least one style'],
  'body-type': (data) => data.bodyType ? [] : ['Please select body type'],
  'fit-preference': (data) => data.fitPreference ? [] : ['Please select fit preference'],
  'color-palette': (data) => data.colorPalette?.length ? [] : ['Please select at least one color'],
  'shoe-size': (data) => data.shoeSize ? [] : ['Please select shoe size'],
  'brand-affinity': (data) => data.brandAffinity?.length ? [] : ['Please select at least one brand'],
  'inspiration-link': (data) => data.inspirationLink ? [] : ['Please provide inspiration link or description'],
  'main-goal': (data) => data.mainGoal ? [] : ['Please select main goal'],
  'test-photo': (data) => data.testPhotoUrl ? [] : ['Please upload a photo'],
  'celebration': () => [],
  'paywall': () => [],
  'completed': () => [],
};

// ============================================================================
// Context Setup
// ============================================================================

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

// ============================================================================
// OnboardingProvider Component
// ============================================================================

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  // ============================================================================
  // Dependencies & State
  // ============================================================================
  
  const { user, isAuthenticated } = useAuth();
  const { profile, updateProfile, getField } = useProfile();
  const { toast } = useToast();
  
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    currentStep: 'welcome',
    totalSteps: ONBOARDING_STEPS.length - 1, // Exclude 'completed'
    data: {},
    isCompleted: false,
    isLoading: false,
    isSaving: false,
    completedSteps: [],
    progress: 0,
    error: null,
    validationErrors: {},
  });

  // ============================================================================
  // Refs for State Tracking
  // ============================================================================
  
  const mountedRef = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // Utility Functions
  // ============================================================================
  
  const updateOnboardingState = useCallback((updates: Partial<OnboardingState>) => {
    if (!mountedRef.current) return;
    
    setOnboardingState(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const calculateProgress = useCallback((step: OnboardingStep, completedSteps: OnboardingStep[]): number => {
    const stepIndex = ONBOARDING_STEPS.indexOf(step);
    const totalSteps = ONBOARDING_STEPS.length - 1; // Exclude 'completed'
    return Math.min((stepIndex / totalSteps) * 100, 100);
  }, []);

  // ============================================================================
  // Data Management
  // ============================================================================
  
  const setStepData = useCallback(<K extends keyof OnboardingData>(
    field: K, 
    value: OnboardingData[K]
  ) => {
    updateOnboardingState({
      data: { ...onboardingState.data, [field]: value },
      validationErrors: { ...onboardingState.validationErrors, [field]: undefined },
    });
  }, [onboardingState.data, onboardingState.validationErrors, updateOnboardingState]);

  const saveStepData = useCallback(async (stepData: Partial<OnboardingData>): Promise<boolean> => {
    if (!user?.id || !mountedRef.current) {
      return false;
    }

    updateOnboardingState({ isSaving: true });

    try {
      // Map onboarding data to profile fields
      const profileUpdates: any = {};
      
      if (stepData.shoppingFrequency) {
        profileUpdates.shopping_frequency = stepData.shoppingFrequency;
      }
      if (stepData.budgetRange) {
        profileUpdates.budget_range = stepData.budgetRange;
      }
      if (stepData.stylePreferences) {
        profileUpdates.style_preferences = stepData.stylePreferences;
      }
      if (stepData.bodyType) {
        profileUpdates.body_type = stepData.bodyType;
      }
      if (stepData.fitPreference) {
        profileUpdates.fit_preference = stepData.fitPreference;
      }
      if (stepData.colorPalette) {
        profileUpdates.color_preferences = stepData.colorPalette;
      }
      if (stepData.shoeSize) {
        profileUpdates.size_info = { shoe_size: stepData.shoeSize };
      }
      if (stepData.brandAffinity) {
        profileUpdates.favorite_brands = stepData.brandAffinity;
      }
      if (stepData.inspirationLink) {
        profileUpdates.referral_source = stepData.inspirationLink;
      }
      if (stepData.mainGoal) {
        profileUpdates.main_goal = stepData.mainGoal;
      }
      if (stepData.testPhotoUrl) {
        profileUpdates.avatar_url = stepData.testPhotoUrl;
      }

      const success = await updateProfile(profileUpdates);
      
      if (success) {
        updateOnboardingState({
          data: { ...onboardingState.data, ...stepData },
          isSaving: false,
          error: null,
        });
      } else {
        updateOnboardingState({
          isSaving: false,
          error: 'Failed to save step data',
        });
      }

      return success;
    } catch (error: any) {
      console.error('Save step data error:', error);
      updateOnboardingState({
        isSaving: false,
        error: error.message || 'Failed to save step data',
      });
      return false;
    }
  }, [user?.id, onboardingState.data, updateProfile, updateOnboardingState]);

  const saveAndAdvance = useCallback(async (stepData: Partial<OnboardingData>): Promise<boolean> => {
    const saved = await saveStepData(stepData);
    if (saved) {
      goToNextStep();
    }
    return saved;
  }, [saveStepData]);

  // ============================================================================
  // Flow Control
  // ============================================================================
  
  const goToStep = useCallback((step: OnboardingStep) => {
    const stepIndex = ONBOARDING_STEPS.indexOf(step);
    const completedSteps = ONBOARDING_STEPS.slice(0, stepIndex);
    const progress = calculateProgress(step, completedSteps);

    updateOnboardingState({
      currentStep: step,
      completedSteps,
      progress,
      error: null,
    });
  }, [calculateProgress, updateOnboardingState]);

  const goToNextStep = useCallback(() => {
    const currentIndex = ONBOARDING_STEPS.indexOf(onboardingState.currentStep);
    const nextIndex = Math.min(currentIndex + 1, ONBOARDING_STEPS.length - 1);
    const nextStep = ONBOARDING_STEPS[nextIndex];
    goToStep(nextStep);
  }, [onboardingState.currentStep, goToStep]);

  const goToPreviousStep = useCallback(() => {
    const currentIndex = ONBOARDING_STEPS.indexOf(onboardingState.currentStep);
    const prevIndex = Math.max(currentIndex - 1, 0);
    const prevStep = ONBOARDING_STEPS[prevIndex];
    goToStep(prevStep);
  }, [onboardingState.currentStep, goToStep]);

  const skipToStep = useCallback(async (step: OnboardingStep): Promise<boolean> => {
    if (!canAdvanceToStep(step)) {
      return false;
    }

    goToStep(step);
    return true;
  }, [goToStep]);

  // ============================================================================
  // Validation
  // ============================================================================
  
  const validateCurrentStep = useCallback((): boolean => {
    const errors = STEP_VALIDATION_RULES[onboardingState.currentStep](onboardingState.data);
    
    if (errors.length > 0) {
      updateOnboardingState({
        validationErrors: { [onboardingState.currentStep]: errors[0] },
      });
      return false;
    }

    return true;
  }, [onboardingState.currentStep, onboardingState.data, updateOnboardingState]);

  const getStepErrors = useCallback((step?: OnboardingStep): string[] => {
    const targetStep = step || onboardingState.currentStep;
    return STEP_VALIDATION_RULES[targetStep](onboardingState.data);
  }, [onboardingState.currentStep, onboardingState.data]);

  const isStepCompleted = useCallback((step: OnboardingStep): boolean => {
    return onboardingState.completedSteps.includes(step);
  }, [onboardingState.completedSteps]);

  const canAdvanceToStep = useCallback((step: OnboardingStep): boolean => {
    const stepIndex = ONBOARDING_STEPS.indexOf(step);
    const currentIndex = ONBOARDING_STEPS.indexOf(onboardingState.currentStep);
    
    // Can always go backwards
    if (stepIndex <= currentIndex) return true;
    
    // Can only advance one step at a time
    return stepIndex <= currentIndex + 1;
  }, [onboardingState.currentStep]);

  // ============================================================================
  // Completion & Reset
  // ============================================================================
  
  const completeOnboarding = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    updateOnboardingState({ isSaving: true });

    try {
      const success = await updateProfile({
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      });

      if (success) {
        updateOnboardingState({
          currentStep: 'completed',
          isCompleted: true,
          isSaving: false,
          progress: 100,
          error: null,
        });

        toast({
          title: "Onboarding Complete!",
          description: "Welcome to your personalized style journey.",
        });
      } else {
        updateOnboardingState({
          isSaving: false,
          error: 'Failed to complete onboarding',
        });
      }

      return success;
    } catch (error: any) {
      console.error('Complete onboarding error:', error);
      updateOnboardingState({
        isSaving: false,
        error: error.message || 'Failed to complete onboarding',
      });
      return false;
    }
  }, [user?.id, updateProfile, updateOnboardingState, toast]);

  const resetOnboarding = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const success = await updateProfile({
        onboarding_completed: false,
        onboarding_step: 'welcome',
      });

      if (success) {
        updateOnboardingState({
          currentStep: 'welcome',
          data: {},
          isCompleted: false,
          completedSteps: [],
          progress: 0,
          error: null,
          validationErrors: {},
        });
      }

      return success;
    } catch (error: any) {
      console.error('Reset onboarding error:', error);
      return false;
    }
  }, [user?.id, updateProfile, updateOnboardingState]);

  const clearError = useCallback(() => {
    updateOnboardingState({ error: null, validationErrors: {} });
  }, [updateOnboardingState]);

  // ============================================================================
  // Auto-sync with Profile
  // ============================================================================
  
  useEffect(() => {
    if (!profile || !isAuthenticated) {
      return;
    }

    // Load existing onboarding data from profile
    const existingData: OnboardingData = {
      shoppingFrequency: profile.shopping_frequency || undefined,
      budgetRange: profile.budget_range || undefined,
      stylePreferences: profile.style_preferences || undefined,
      bodyType: profile.body_type || undefined,
      fitPreference: profile.fit_preference || undefined,
      colorPalette: profile.color_preferences || undefined,
      shoeSize: profile.size_info?.shoe_size || undefined,
      brandAffinity: profile.favorite_brands || undefined,
      inspirationLink: profile.referral_source || undefined,
      mainGoal: profile.main_goal || undefined,
      testPhotoUrl: profile.avatar_url || undefined,
    };

    // Determine current step based on completed data
    let currentStep: OnboardingStep = 'welcome';
    const completedSteps: OnboardingStep[] = [];

    for (const step of ONBOARDING_STEPS) {
      const errors = STEP_VALIDATION_RULES[step](existingData);
      if (errors.length === 0) {
        completedSteps.push(step);
        if (step !== 'completed') {
          currentStep = ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) + 1] || 'completed';
        }
      } else {
        break;
      }
    }

    // Check if onboarding is already completed
    const isCompleted = profile.onboarding_completed === true;
    if (isCompleted) {
      currentStep = 'completed';
    }

    const progress = calculateProgress(currentStep, completedSteps);

    updateOnboardingState({
      data: existingData,
      currentStep,
      completedSteps,
      isCompleted,
      progress,
    });

  }, [profile, isAuthenticated, calculateProgress, updateOnboardingState]);

  // ============================================================================
  // Cleanup
  // ============================================================================
  
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================================
  // Context Value
  // ============================================================================
  
  const contextValue: OnboardingContextType = {
    // State
    ...onboardingState,
    
    // Actions
    goToStep,
    goToNextStep,
    goToPreviousStep,
    skipToStep,
    setStepData,
    saveStepData,
    saveAndAdvance,
    completeOnboarding,
    resetOnboarding,
    validateCurrentStep,
    getStepErrors,
    isStepCompleted,
    canAdvanceToStep,
    clearError,
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
};

export default OnboardingProvider; 