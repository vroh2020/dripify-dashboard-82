import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Logger } from "@/utils/logger";
import { handleError } from "@/utils/errorHandler";
import { supabase } from "@/integrations/supabase/client";

// Import step components
import { NewWelcomeStep } from "../components/onboarding/steps/NewWelcomeStep";
import { HowItWorksStep } from "../components/onboarding/steps/HowItWorksStep";
import { GetGradeStep } from "../components/onboarding/steps/GetGradeStep";
import { AnalyzingStep } from "../components/onboarding/steps/AnalyzingStep";
import { TeaserResultStep } from "../components/onboarding/steps/TeaserResultStep";
import { ProOfferCard } from "../components/onboarding/ProOfferCard";


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

  // State for photo and analysis
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Get or create persistent anonymous user
  const ensureAnonymousUser = async () => {
    try {
      // If we already have a userId in state, verify it's still valid
      if (userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id === userId) {
          Logger.info('Auth', 'Reusing existing user ID:', userId);
          return userId;
        }
        // Clear invalid cached user
        setUserId(null);
      }

      // Get the current Supabase user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.id) {
        Logger.info('Auth', 'Using Supabase auth user ID:', user.id);
        setUserId(user.id);
        return user.id;
      } else {
        console.error('❌ No authenticated user found, creating anonymous user...');
        // Auto-create new anonymous user if none exists
        const { handleAnonymousSign } = await import('../components/onboarding/utils/auth');
        const success = await handleAnonymousSign();
        if (success) {
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (newUser?.id) {
            setUserId(newUser.id);
            return newUser.id;
          }
        }
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting authenticated user:', error);
      return null;
    }
  };

  // Save onboarding step to modified onboarding_v2 table (single row per user)
  const saveOnboardingStep = async (stepName: string, stepData?: any) => {
    if (!userId) return false;
    
    try {
      // Get current data first (handle case where no data exists yet)
      const { data: existingData, error: fetchError } = await supabase
        .from('onboarding_v2')
        .select('step_data')
        .eq('user_id', userId)
        .maybeSingle();

      // Ignore error if no data exists yet (it's fine, we'll create it)
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.warn('Error fetching existing data:', fetchError);
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
      
      console.log('✅ Saved onboarding step:', stepName, stepData);
      return true;
    } catch (error) {
      console.error('❌ Error saving onboarding step:', error);
      return false;
    }
  };

  // Track user actions in user_analytics table
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
      
      console.log('📊 Tracked user action:', action, data);
      return true;
    } catch (error) {
      console.error('❌ Error tracking user action:', error);
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
      
      console.log('✅ Saved analysis result:', { score, imageUrl });
      return true;
    } catch (error) {
      console.error('❌ Error saving analysis result:', error);
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
          emoji: '✨',
          feedback: "Great style choices! Your outfit shows confidence."
        },
        { 
          category: 'Fit', 
          score: Math.min(100, baseScore + Math.floor(Math.random() * variance)), 
          emoji: '🧥',
          feedback: "The fit looks good on you. Well proportioned."
        },
        { 
          category: 'Color', 
          score: Math.min(100, baseScore + Math.floor(Math.random() * variance) - 3), 
          emoji: '🎨',
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

  // Initialize anonymous user on component mount
  useEffect(() => {
    ensureAnonymousUser();
  }, []);

  // Simple handlers for anonymous flow with new tracking
  const handleHowItWorksNext = async () => {
    const userId = await ensureAnonymousUser();
    if (userId) {
      await saveOnboardingStep('how_it_works_completed', {});
      await trackUserAction('how_it_works_completed', { step: 2 }); // Updated step number
    }
    setStep(3); // Go directly to photo capture (removed vibe selection)
  };

  const handleHowItWorksBack = () => {
    setStep(1); // Go back to welcome
  };

  const handlePhotoCapture = async (file: File) => {
    setSelectedImage(file);
    
    const userId = await ensureAnonymousUser();
    if (!userId) {
      toast({
        title: "Error",
        description: "Please refresh and try again.",
        variant: "destructive"
      });
      return;
    }
    
    // Save to database (optional - continues even if fails)
    await saveOnboardingStep('photo_uploaded', { hasPhoto: true });
    await trackUserAction('photo_uploaded', { fileSize: file.size, step: 3 }); // Updated step number
    
    setStep(4); // Go to analyzing
  };

  const handleGetGradeBack = () => {
    setStep(2); // Go back to how it works (removed vibe selection)
  };

  const handleAnalyzingComplete = async () => {
    try {
      // Validate image exists
      if (!selectedImage) {
        toast({
          title: "No Image",
          description: "Please select a photo first.",
          variant: "destructive"
        });
        setStep(3); // Back to photo capture
        return;
      }

      // Perform fake analysis - no AI credits used
      const analysisResult = await performFakeAnalysis(selectedImage);
      
      // Save analysis data to tables
      const userId = await ensureAnonymousUser();
      if (userId) {
        const saved = await saveAnalysisResult(
          analysisResult.imageUrl, 
          analysisResult.analysis, 
          analysisResult.analysis.overallScore
        );
        
        if (saved) {
          await saveOnboardingStep('analysis_completed', { 
            score: analysisResult.analysis.overallScore,
            hasAnalysis: true 
          });
          await trackUserAction('analysis_completed', { 
            score: analysisResult.analysis.overallScore,
            breakdown: analysisResult.analysis.breakdown,
            step: 4 // Updated step number
          });
        }
      }
      
      setAnalysisResult(analysisResult.analysis);
      localStorage.setItem('analysis_result', JSON.stringify(analysisResult.analysis));
      setStep(5); // Go to teaser results
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze your photo. Please try again.",
        variant: "destructive"
      });
      // Allow user to go back and retry
      setStep(3); 
    }
  };

  const handleTeaserUnlock = async () => {
    const userId = await ensureAnonymousUser();
    if (userId) {
      await saveOnboardingStep('teaser_viewed', { unlockedAt: new Date().toISOString() });
      await trackUserAction('teaser_viewed', { step: 5 }); // Updated step number
    }
    setStep(6); // Go to paywall
  };

  const handlePaywallComplete = async () => {
    try {
      Logger.userAction('paywall_completed', { step });
      
      // Save completion data to new tables
      const userId = await ensureAnonymousUser();
      if (userId) {
        await saveOnboardingStep('completed', { 
          paymentCompleted: true,
          subscriptionStatus: 'active'
        });
        await trackUserAction('paywall_completed', { step });
      }
      
      // Mark onboarding as completed
              localStorage.setItem('onboarding_completed', 'true');
        
        // Also mark onboarding as completed in database
        if (userId) {
          await supabase
            .from('onboarding_v2')
            .update({
              completed: true,
              completed_at: new Date().toISOString(),
              current_step: 'completed'
            })
            .eq('user_id', userId);
        }
      localStorage.setItem('subscription_active', 'true');
      
      toast({
        title: "Welcome to Pro! 🎉",
        description: "Your subscription is now active.",
      });
      
      // Navigate to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
      
    } catch (error) {
      handleError(error, 'Auth:handlePaywallComplete');
    }
  };





  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 flex flex-col">
      {/* Step Content */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <NewWelcomeStep 
              key="welcome"
              onNext={async () => {
                const userId = await ensureAnonymousUser();
                if (userId) {
                  await saveOnboardingStep('welcome_completed', { startedAt: new Date().toISOString() });
                  await trackUserAction('welcome_completed', { step: 1 });
                }
                setStep(2);
              }} 
            />
          )}
          
          {step === 2 && (
            <HowItWorksStep 
              key="how-it-works"
              onNext={handleHowItWorksNext}
              onBack={handleHowItWorksBack}
            />
          )}
          
          {step === 3 && (
            <GetGradeStep 
              key="get-grade"
              onPhotoCapture={handlePhotoCapture}
              onBack={handleGetGradeBack}
            />
          )}
          
          {step === 4 && (
            <AnalyzingStep 
              key="analyzing"
              onComplete={handleAnalyzingComplete}
            />
          )}
          
          {step === 5 && analysisResult && (
            <TeaserResultStep 
              key="teaser"
              onUnlock={handleTeaserUnlock}
              result={analysisResult}
            />
          )}
          
          {step === 6 && (
            <ProOfferCard 
              key="paywall"
              onContinue={handlePaywallComplete}
            />
          )}


        </AnimatePresence>
      </div>
    </div>
  );
};

export const Auth = AuthOnboardingWizard;
export default Auth;
