import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Logger } from "@/utils/logger";
import { handleError } from "@/utils/errorHandler";
import { supabase } from "@/integrations/supabase/client";
import { preloadBackgroundRemovalModel } from "@/utils/backgroundRemoval";

// Import onboarding step components
import { WelcomeHeroStep } from "../components/onboarding/steps/WelcomeHeroStep";
import { GenderSelectionStep } from "../components/onboarding/steps/GenderSelectionStep";
import { AgeRangeStep } from "../components/onboarding/steps/AgeRangeStep";
import { HeightStep } from "../components/onboarding/steps/HeightStep";
import { SizeStep } from "../components/onboarding/steps/SizeStep";
import { ShoppingExperienceStep } from "../components/onboarding/steps/ShoppingExperienceStep";
import { BrandPreferenceStep } from "../components/onboarding/steps/BrandPreferenceStep";
import { OccasionDifficultyStep } from "../components/onboarding/steps/OccasionDifficultyStep";
import { StyleKnowledgeStep } from "../components/onboarding/steps/StyleKnowledgeStep";
import { WardrobeStylingStep } from "../components/onboarding/steps/WardrobeStylingStep";
import { ColorAnalysisIntroStep } from "../components/onboarding/steps/ColorAnalysisIntroStep";
import { PersonalizingStep } from "../components/onboarding/steps/PersonalizingStep";
import { FreeTrialPaywallStep } from "../components/onboarding/steps/FreeTrialPaywallStep";
import { ProOfferCard } from "../components/onboarding/ProOfferCard";


export const AuthOnboardingWizard = () => {
  // Simple step management for anonymous users
  const stepKey = 'onboarding_step';
  const [step, setStepState] = useState<number>(() => {
    const saved = localStorage.getItem(stepKey);
    return saved ? parseInt(saved, 10) : 1;
  });  const setStep = (n: number) => {
    setStepState(n);
    localStorage.setItem(stepKey, String(n));
  };

  // React Router navigation. We deliberately avoid `window.location.href`
  // here — a full document reload wipes React state and was the root
  // cause of the "free-tier user bounces back into the first paywall"
  // loop. `navigate('/scan')` keeps the React tree alive so the new
  // App.tsx route gate can re-evaluate hasCompletedOnboarding without
  // losing the current component state.
  const navigate = useNavigate();

  // State for onboarding data
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [onboardingData, setOnboardingData] = useState<any>({});

  // Track if model preload has started (prevent duplicate calls)
  const modelPreloadStartedRef = useRef<boolean>(false);

  // Get current user ID (no creation - let NewWelcomeStep handle that)
  const getCurrentUserId = async () => {
    try {
      // If we already have a userId, return it immediately
      if (userId) {
        return userId;
      }

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.id) {
        // User exists, update state and return
        setUserId(session.user.id);
        return session.user.id;
      }
      
      return null;
    } catch (error) {
      Logger.error('Auth', 'Error getting current user:', error);
      return null;
    }
  };

  // Save onboarding step to modified onboarding_v2 table (single row per user)
  const saveOnboardingStep = async (stepName: string, stepData?: any) => {
    if (!userId) {
      Logger.warn('Auth', `saveOnboardingStep called but userId is null for step: ${stepName}`);
      return false;
    }
    
    Logger.info('Auth', `💾 Saving onboarding step: ${stepName} for user: ${userId}`);
    
    try {
      // Get current data first (handle case where no data exists yet)
      const { data: existingData, error: fetchError } = await supabase
        .from('onboarding_v2')
        .select('step_data')
        .eq('user_id', userId)
        .maybeSingle();

      // Ignore error if no data exists yet (it's fine, we'll create it)
      if (fetchError && fetchError.code !== 'PGRST116') {
        Logger.warn('Auth', 'Error fetching existing data:', fetchError);
      }

      // Merge new step data with existing data (use step_data for now)
      const currentAllData = existingData?.step_data || {};
      const updatedAllData = {
        ...(currentAllData as Record<string, any>),
        [stepName]: stepData || {}
      };

      const { error } = await supabase
        .from('onboarding_v2')
        .upsert({
          user_id: userId,
          step: 'consolidated',
          step_data: updatedAllData,
          current_step: stepName,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (error) throw error;
      
      Logger.info('Auth', `✅ Successfully saved onboarding step: ${stepName}`);
      return true;
    } catch (error) {
      Logger.error('Auth', 'Error saving onboarding step:', error);
      return false;
    }
  };

  // Track user actions in user_analytics table - TRACK EVERY SINGLE STEP
  const trackUserAction = async (action: string, data?: any) => {
    if (!userId) return false;
    
    try {
      const { error } = await supabase
        .from('user_analytics')
        .insert({
          user_id: userId,
          action,
          data: data || {},
          timestamp: new Date().toISOString()
        });

      if (error) throw error;
      
      return true;
    } catch (error) {
      Logger.error('Auth', 'Error tracking user action:', error);
      return false;
    }
  };

  // Initialize user tracking on component mount
  useEffect(() => {
    getCurrentUserId();
  }, []);

  // Track when user reaches paywall step
  useEffect(() => {
    if (step === 14 && userId) {
      trackUserAction('paywall_reached', { step: 14 }).catch(console.error);
    }
  }, [step, userId]);

  // 🚀 PRELOAD MODEL DURING ONBOARDING - Early trigger on photo capture (Step 11)
  // Gives maximum time for model to download while user is still in onboarding
  useEffect(() => {
    if (step === 11 && !modelPreloadStartedRef.current) {
      modelPreloadStartedRef.current = true;
      console.log('🚀 [Onboarding] Starting early model preload during photo capture step...');
      
      // Start preload in background - doesn't block UI
      preloadBackgroundRemovalModel().catch((error) => {
        console.warn('⚠️ [Onboarding] Early model preload failed (will retry later):', error);
        // Reset flag so we can try again after payment
        modelPreloadStartedRef.current = false;
      });
    }
  }, [step]);

  // 🚀 PRELOAD MODEL DURING ONBOARDING - Backup trigger after payment (Step 14)
  // Ensures model starts loading even if user rushed through early steps
  useEffect(() => {
    if (step === 14 && !modelPreloadStartedRef.current) {
      modelPreloadStartedRef.current = true;
      console.log('🚀 [Onboarding] Starting model preload after payment (backup trigger)...');
      
      // Start preload in background - doesn't block UI
      preloadBackgroundRemovalModel().catch((error) => {
        console.warn('⚠️ [Onboarding] Backup model preload failed (will load on first upload):', error);
      });
    }
  }, [step]);

  // Onboarding handlers
  const handleGender = async (gender: string) => {
    setOnboardingData(prev => ({ ...prev, gender }));
    if (userId) {
      saveOnboardingStep('gender', { gender }).catch(console.error);
      trackUserAction('gender_selected', { gender, step: 2 }).catch(console.error);
    }
    setStep(3);
  };

  const handleAgeRange = async (ageRange: string) => {
    setOnboardingData(prev => ({ ...prev, age_range: ageRange }));
    if (userId) {
      saveOnboardingStep('age_range', { ageRange }).catch(console.error);
      trackUserAction('age_range_selected', { ageRange, step: 3 }).catch(console.error);
    }
    setStep(4);
  };

  const handleHeight = async (height: string) => {
    setOnboardingData(prev => ({ ...prev, height }));
    if (userId) {
      saveOnboardingStep('height', { height }).catch(console.error);
      trackUserAction('height_entered', { height, step: 4 }).catch(console.error);
    }
    setStep(5);
  };

  const handleSize = async (size: string) => {
    setOnboardingData(prev => ({ ...prev, size }));
    if (userId) {
      saveOnboardingStep('size', { size }).catch(console.error);
      trackUserAction('size_selected', { size, step: 5 }).catch(console.error);
    }
    setStep(6);
  };

  const handleShoppingExperience = async (experience: string) => {
    setOnboardingData(prev => ({ ...prev, shopping_experience: experience }));
    if (userId) {
      saveOnboardingStep('shopping_experience', { experience }).catch(console.error);
      trackUserAction('shopping_experience_selected', { experience, step: 6 }).catch(console.error);
    }
    setStep(7);
  };

  const handleBrandPreference = async (preference: string) => {
    setOnboardingData(prev => ({ ...prev, brand_preference: preference }));
    if (userId) {
      saveOnboardingStep('brand_preference', { preference }).catch(console.error);
      trackUserAction('brand_preference_selected', { preference, step: 7 }).catch(console.error);
    }
    setStep(8);
  };

  const handleOccasionDifficulty = async (occasion: string) => {
    setOnboardingData(prev => ({ ...prev, occasion_difficulty: occasion }));
    if (userId) {
      saveOnboardingStep('occasion_difficulty', { occasion }).catch(console.error);
      trackUserAction('occasion_difficulty_selected', { occasion, step: 8 }).catch(console.error);
    }
    setStep(9);
  };

  const handleStyleKnowledge = async (knowledge: string) => {
    setOnboardingData(prev => ({ ...prev, style_knowledge: knowledge }));
    if (userId) {
      saveOnboardingStep('style_knowledge', { knowledge }).catch(console.error);
      trackUserAction('style_knowledge_selected', { knowledge, step: 9 }).catch(console.error);
    }
    setStep(10);
  };

  const handleWardrobeStyling = async (answer: string) => {
    setOnboardingData(prev => ({ ...prev, wardrobe_styling: answer }));
    if (userId) {
      saveOnboardingStep('wardrobe_styling', { answer }).catch(console.error);
      trackUserAction('wardrobe_styling_selected', { answer, step: 10 }).catch(console.error);
    }
    setStep(11); // Go to color analysis intro
  };

  const handlePhotoCapture = async (imageFile: File) => {
    setSelectedImage(imageFile);
    
    if (userId) {
      saveOnboardingStep('selfie_captured', { hasPhoto: true }).catch(console.error);
      trackUserAction('selfie_captured', { fileSize: imageFile.size, step: 11 }).catch(console.error);
    }
    
    setStep(12); // Go to personalizing step
  };

  const handlePersonalizingComplete = async () => {
    if (userId) {
      saveOnboardingStep('personalization_completed', { completedAt: new Date().toISOString() }).catch(console.error);
      trackUserAction('personalization_completed', { step: 12 }).catch(console.error);
    }
    
    setStep(13); // Go to free trial paywall step
  };

  const handleFreeTrialPaywallComplete = async (tier: string) => {
    if (userId) {
      saveOnboardingStep('free_trial_paywall_completed', { tier }).catch(console.error);
      trackUserAction('free_trial_paywall_completed', { tier, step: 13 }).catch(console.error);
    }
    
    setStep(14); // Go directly to ProOfferCard (skip TrialTimelineStep)
  };

  const handlePaywallComplete = async (tier: string, paywallSource: 'paywall_1' | 'paywall_2' | 'free' = 'paywall_1') => {
    console.log('🎯 handlePaywallComplete called with:', { tier, paywallSource });
    
    try {
      if (userId) {
        console.log('💾 Saving paywall completion data for user:', userId);
        // Save comprehensive paywall completion data
        saveOnboardingStep('paywall_completed', { 
          subscriptionTier: tier,
          paywallSource,
          completedAt: new Date().toISOString(),
          finalDecision: tier === 'free' ? 'skipped_both_paywalls' : `purchased_${paywallSource}`
        }).catch(console.error);
        
        trackUserAction('paywall_completed', { 
          tier, 
          step: 14,
          paywallSource,
          decision: tier
        }).catch(console.error);
      }
      
      // Mark onboarding as completed
      console.log('💾 Setting localStorage values...');
      localStorage.setItem('onboarding_completed', 'true');
      // For free tier, still mark as "active" so they can access the app
      localStorage.setItem('subscription_active', 'true'); // Always true - free users can still use app
      localStorage.setItem('subscription_tier', tier);
      console.log('✅ localStorage updated');
        
      // Mark as completed in database with tier tracking
      if (userId) {
          try {
          console.log('📝 Updating database...');
          
          // First, try to get current step_data
          const { data: currentData, error: fetchError } = await supabase
            .from('onboarding_v2')
            .select('step_data')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (fetchError) {
            console.warn('⚠️ Could not fetch step_data:', fetchError);
          }
          
          const stepData = (currentData?.step_data as any) || {};
          
          // Add final paywall state
          const updatedStepData = {
            ...stepData,
            paywall_final_state: {
              tier,
              paywallSource,
              timestamp: new Date().toISOString(),
              userJourney: paywallSource === 'paywall_2' ? 'dismissed_paywall_1_then_purchased' : 
                           paywallSource === 'free' ? 'dismissed_both_paywalls' : 'purchased_paywall_1'
            }
          };
          
          // Update with upsert to handle missing row
          const { error } = await supabase
              .from('onboarding_v2')
              .upsert({
                user_id: userId,
                completed: true,
                completed_at: new Date().toISOString(),
                current_step: 'completed',
                step_data: updatedStepData
              }, {
                onConflict: 'user_id'
              });
          
          if (error) {
            console.error('❌ Database error:', error);
            // Don't throw - continue anyway
          } else {
            console.log('✅ Database updated successfully with tier:', tier);
          }
        } catch (dbError) {
          console.error('❌ Failed to save to database:', dbError);
          // Don't throw - let user continue even if DB save fails
        }
      }
      
      console.log('📢 Showing toast notification...');
      toast({
        title: tier === 'free' ? "Welcome to trendza!" : "Welcome to Premium!",
        description: tier === 'free' 
          ? "You have 3 free outfit ratings per month." 
          : "Your subscription is now active.",
      });
      
      // The model is preloading from Step 11 or Step 14 (see the
      // useEffects above). By the time the user lands in the dashboard
      // it will be ready for instant uploads.

      // Hand off to React Router instead of `window.location.href`.
      // A full-document reload would wipe this component's state and
      // was the root cause of the free-tier paywall loop; SPA
      // navigation keeps the React tree alive and lets App.tsx's
      // route gate re-evaluate against the freshly-set
      // localStorage `onboarding_completed=true` flag without a
      // state regression.
      setTimeout(() => {
        navigate('/scan');
      }, 1000);

    } catch (error) {
      console.error('❌ Error in handlePaywallComplete:', error);
      handleError(error, 'Auth:handlePaywallComplete');
    }
  };

  // Back navigation handlers
  const handleBackToStep = (targetStep: number) => {
    setStep(targetStep);
  };

  return (
    <div
      className="h-full app-shell-scroll"
      style={{ background: 'var(--bg-primary)' }}
    >
        <AnimatePresence mode="wait" initial={false}>
          {step === 1 && (
          <WelcomeHeroStep 
            key="welcome-hero"
            onNext={() => {
                 setStep(2);
                 if (userId) {
                   saveOnboardingStep('welcome_completed', { startedAt: new Date().toISOString() }).catch(console.error);
                   trackUserAction('welcome_completed', { step: 1 }).catch(console.error);
                 }
               }}
               onUserCreated={(userId) => {
                 setUserId(userId);
              Logger.info('Auth', 'User created:', userId);
               }}
             />
          )}
          
          {step === 2 && (
          <GenderSelectionStep 
            key="gender-selection"
            onNext={handleGender}
            onBack={() => handleBackToStep(1)}
            />
          )}
          
          {step === 3 && (
          <AgeRangeStep 
            key="age-range"
            onNext={handleAgeRange}
            onBack={() => handleBackToStep(2)}
            />
          )}
          
          {step === 4 && (
          <HeightStep 
            key="height"
            onNext={handleHeight}
            onBack={() => handleBackToStep(3)}
            />
          )}
          
          {step === 5 && (
          <SizeStep 
            key="size"
            onNext={handleSize}
            onBack={() => handleBackToStep(4)}
            />
          )}
          
          {step === 6 && (
          <ShoppingExperienceStep 
            key="shopping-experience"
            onNext={handleShoppingExperience}
            onBack={() => handleBackToStep(5)}
            />
          )}
          
          {step === 7 && (
          <BrandPreferenceStep 
            key="brand-preference"
            onNext={handleBrandPreference}
            onBack={() => handleBackToStep(6)}
            />
          )}
          
          {step === 8 && (
          <OccasionDifficultyStep 
            key="occasion-difficulty"
            onNext={handleOccasionDifficulty}
            onBack={() => handleBackToStep(7)}
            />
          )}
          
          {step === 9 && (
          <StyleKnowledgeStep 
            key="style-knowledge"
            onNext={handleStyleKnowledge}
            onBack={() => handleBackToStep(8)}
            />
          )}
          
          {step === 10 && (
          <WardrobeStylingStep 
            key="wardrobe-styling"
            onNext={handleWardrobeStyling}
            onBack={() => handleBackToStep(9)}
            />
          )}
          
          {step === 11 && (
          <ColorAnalysisIntroStep 
            key="color-analysis-intro"
            onCapture={handlePhotoCapture}
            onBack={() => handleBackToStep(10)}
          />
        )}
        
        {step === 12 && (
          <PersonalizingStep 
            key="personalizing"
            userImage={selectedImage ? URL.createObjectURL(selectedImage) : undefined}
            onComplete={handlePersonalizingComplete}
          />
        )}
        
        {step === 13 && (
          <FreeTrialPaywallStep 
            key="free-trial-paywall"
            onComplete={handleFreeTrialPaywallComplete}
          />
        )}
        
        {step === 14 && (
          <ProOfferCard
            key="pro-offer-card"
            onContinue={() => {
              // User purchased from the paywall
              handlePaywallComplete('pro', 'paywall_1');
            }}
            onSkipToFreeTier={() => {
              // User opted into the limited free tier from the
              // bottom of the paywall. No second paywall — the X
              // button path has been removed per product decision,
              // and free-tier users now go straight through.
              handlePaywallComplete('free', 'free');
            }}
          />
        )}
        </AnimatePresence>
    </div>
  );
};

export const Auth = AuthOnboardingWizard;
export default Auth;
