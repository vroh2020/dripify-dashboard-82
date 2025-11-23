import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Logger } from "@/utils/logger";
import { handleError } from "@/utils/errorHandler";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from '@capacitor/core';

// Import new onboarding step components
import { WelcomeHeroStep } from "../components/onboarding/steps/WelcomeHeroStep";
import { StyleGoalStep } from "../components/onboarding/steps/StyleGoalStep";
import { PainPointStep } from "../components/onboarding/steps/PainPointStep";
import { ClosetSizeStep } from "../components/onboarding/steps/ClosetSizeStep";
import { ShoppingFrequencyNewStep } from "../components/onboarding/steps/ShoppingFrequencyNewStep";
import { ColorAnalysisIntroStep } from "../components/onboarding/steps/ColorAnalysisIntroStep";
import { PersonalizingStep } from "../components/onboarding/steps/PersonalizingStep";
import { PaywallStep } from "../components/onboarding/steps/PaywallStep";


export const AuthOnboardingWizard = () => {
  // Simple step management for anonymous users
  const stepKey = 'onboarding_step';
  const [step, setStepState] = useState<number>(() => {
    const saved = localStorage.getItem(stepKey);
    return saved ? parseInt(saved, 10) : 1;
  });
  
  const setStep = (n: number) => {
    setStepState(n);
    localStorage.setItem(stepKey, String(n));
  };

  // State for onboarding data
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [onboardingData, setOnboardingData] = useState<any>({});

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

  // Save analysis results to analysis_results table
  const saveAnalysisResult = async (imageUrl: string, analysisData: any, score: number) => {
    if (!userId) return false;
    
    try {
      const { error } = await supabase
        .from('analysis_results')
        .insert({
          user_id: userId,
          image_url: imageUrl,
          analysis_data: analysisData,
          score: score,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      
      return true;
    } catch (error) {
      Logger.error('Auth', 'Error saving analysis result:', error);
      return false;
    }
  };

  // Fake analysis function - no AI credits used
  const performFakeAnalysis = async (imageFile: File): Promise<any> => {
    // Generate realistic fake scores
    const baseScore = Math.floor(Math.random() * 15) + 75; // 75-90 base
    const variance = 10; // Allow some variation
    
    const fakeAnalysis = {
      overallScore: Math.min(100, baseScore + Math.floor(Math.random() * variance)),
      breakdown: [
        { 
          category: 'Style', 
          score: Math.min(100, baseScore + Math.floor(Math.random() * variance) - 5), 
          emoji: '',
          feedback: "Great style choices! Your outfit shows confidence."
        },
        { 
          category: 'Fit', 
          score: Math.min(100, baseScore + Math.floor(Math.random() * variance)), 
          emoji: '',
          feedback: "The fit looks good on you. Well proportioned."
        },
        { 
          category: 'Color', 
          score: Math.min(100, baseScore + Math.floor(Math.random() * variance) - 3), 
          emoji: '',
          feedback: "Nice color coordination. The palette works well."
        }
      ],
      tips: [
        "Consider adding a statement accessory to elevate the look",
        "The color combination works great for your style",
        "This outfit shows good understanding of proportions"
      ],
      summary: "Looking sharp! You have a good eye for putting together outfits that work well together."
    };
    
    return {
      success: true,
      imageUrl: URL.createObjectURL(imageFile), // Local URL, no upload
      analysis: fakeAnalysis,
      timestamp: new Date().toISOString()
    };
  };

  // Initialize user tracking on component mount
  useEffect(() => {
    getCurrentUserId();
  }, []);

  // Track when user reaches paywall step
  useEffect(() => {
    if (step === 8 && userId) {
      trackUserAction('paywall_reached', { step: 8 }).catch(console.error);
    }
  }, [step, userId]);

  // New 10-step onboarding handlers
  const handleStyleGoal = async (goal: string) => {
    setOnboardingData(prev => ({ ...prev, style_goal: goal }));
    if (userId) {
      saveOnboardingStep('style_goal', { goal }).catch(console.error);
      trackUserAction('style_goal_selected', { goal, step: 2 }).catch(console.error);
    }
    setStep(3);
  };

  const handlePainPoint = async (painPoint: string) => {
    setOnboardingData(prev => ({ ...prev, pain_point: painPoint }));
    if (userId) {
      saveOnboardingStep('pain_point', { painPoint }).catch(console.error);
      trackUserAction('pain_point_selected', { painPoint, step: 3 }).catch(console.error);
    }
    setStep(4);
  };

  const handleClosetSize = async (closetSize: string) => {
    setOnboardingData(prev => ({ ...prev, closet_size: closetSize }));
    if (userId) {
      saveOnboardingStep('closet_size', { closetSize }).catch(console.error);
      trackUserAction('closet_size_selected', { closetSize, step: 4 }).catch(console.error);
    }
    setStep(5);
  };

  const handleShoppingFrequency = async (frequency: string) => {
    setOnboardingData(prev => ({ ...prev, shopping_frequency: frequency }));
    if (userId) {
      saveOnboardingStep('shopping_frequency', { frequency }).catch(console.error);
      trackUserAction('shopping_frequency_selected', { frequency, step: 5 }).catch(console.error);
    }
    setStep(6); // Go to color analysis intro
  };

  const handlePhotoCapture = async (imageFile: File) => {
    setSelectedImage(imageFile);
    
    if (userId) {
      saveOnboardingStep('selfie_captured', { hasPhoto: true }).catch(console.error);
      trackUserAction('selfie_captured', { fileSize: imageFile.size, step: 6 }).catch(console.error);
    }
    
    setStep(7); // Go to personalizing step
  };

  const handlePersonalizingComplete = async () => {
    if (userId) {
      saveOnboardingStep('personalization_completed', { completedAt: new Date().toISOString() }).catch(console.error);
      trackUserAction('personalization_completed', { step: 7 }).catch(console.error);
    }
    
    setStep(8); // Go directly to paywall (no results shown)
  };

  const handlePaywallComplete = async (tier: string) => {
    try {
      if (userId) {
        saveOnboardingStep('paywall_completed', { 
          subscriptionTier: tier,
          completedAt: new Date().toISOString()
        }).catch(console.error);
        trackUserAction('paywall_completed', { tier, step: 10 }).catch(console.error);
      }
      
      // Mark onboarding as completed
      localStorage.setItem('onboarding_completed', 'true');
      localStorage.setItem('subscription_active', 'true');
        
      // Mark as completed in database
      if (userId) {
          try {
          const { error } = await supabase
              .from('onboarding_v2')
              .update({
                completed: true,
                completed_at: new Date().toISOString(),
              subscription_tier: tier,
                current_step: 'completed'
              })
              .eq('user_id', userId);
          
          if (error) {
            console.error('❌ Database error:', error);
          } else {
            console.log('✅ Onboarding completed successfully');
          }
        } catch (dbError) {
          console.error('❌ Failed to save onboarding:', dbError);
          // Don't throw - let user continue even if DB save fails
        }
      }
      
      toast({
        title: "Welcome to OutfitGrader AI!",
        description: "Your account is now active.",
      });
      
      // Navigate to main app
      setTimeout(() => {
        window.location.href = '/scan';
      }, 1000);
      
    } catch (error) {
      handleError(error, 'Auth:handlePaywallComplete');
    }
  };

  // Back navigation handlers
  const handleBackToStep = (targetStep: number) => {
    setStep(targetStep);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
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
          <StyleGoalStep 
            key="style-goal"
            onNext={handleStyleGoal}
            onBack={() => handleBackToStep(1)}
            />
          )}
          
          {step === 3 && (
          <PainPointStep 
            key="pain-point"
            onNext={handlePainPoint}
            onBack={() => handleBackToStep(2)}
            />
          )}
          
          {step === 4 && (
          <ClosetSizeStep 
            key="closet-size"
            onNext={handleClosetSize}
            onBack={() => handleBackToStep(3)}
            />
          )}
          
        {step === 5 && (
          <ShoppingFrequencyNewStep 
            key="shopping-frequency"
            onNext={handleShoppingFrequency}
            onBack={() => handleBackToStep(4)}
            />
          )}
          
          {step === 6 && (
          <ColorAnalysisIntroStep 
            key="color-analysis-intro"
            onCapture={handlePhotoCapture}
            onBack={() => handleBackToStep(5)}
          />
        )}
        
        {step === 7 && (
          <PersonalizingStep 
            key="personalizing"
            userImage={selectedImage ? URL.createObjectURL(selectedImage) : undefined}
            onComplete={handlePersonalizingComplete}
          />
        )}
        
        {step === 8 && (
          <PaywallStep 
            key="paywall"
            onComplete={handlePaywallComplete}
          />
        )}
        </AnimatePresence>
    </div>
  );
};

export const Auth = AuthOnboardingWizard;
export default Auth;
