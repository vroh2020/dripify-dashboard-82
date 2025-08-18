import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Logger } from "@/utils/logger";
import { handleError } from "@/utils/errorHandler";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from '@capacitor/core';

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

  // Track user actions in user_analytics table (optimized - only track key events)
  const trackUserAction = async (action: string, data?: any) => {
    if (!userId) return false;
    
    // Only track important events to reduce database load
    const importantActions = ['paywall_completed', 'analysis_completed', 'photo_uploaded'];
    if (!importantActions.includes(action)) return true;
    
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

  // Initialize user tracking on component mount
  useEffect(() => {
    getCurrentUserId();
  }, []);

  // Simple handlers for anonymous flow with optimized tracking
  const handleHowItWorksNext = async () => {
    // Save "How It Works" completion
    if (userId) {
      saveOnboardingStep('how_it_works_completed', { completedAt: new Date().toISOString() }).catch(console.error);
    }
    
    // Auto-trigger camera immediately instead of going to photo upload screen
    await handleAutoCameraCapture();
  };

  // Auto-trigger camera capture to reduce drop-off
  const handleAutoCameraCapture = async () => {
    try {
      const isCapacitor = Capacitor?.isNativePlatform?.() || false;
      
      if (!isCapacitor) {
        // Web platform - use file upload
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment'; // Prefer rear camera on mobile web
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            await handlePhotoCapture(file);
          }
        };
        input.click();
        return;
      }

      // Native platform - use Capacitor Camera
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        promptLabelHeader: 'Take your picture',
        promptLabelCancel: 'Cancel',
        promptLabelPhoto: 'Photo',
      });
      
      if (photo?.dataUrl) {
        const res = await fetch(photo.dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'photo.jpg', { type: blob.type });
        await handlePhotoCapture(file);
      } else {
        setStep(3); // Fallback to photo upload screen
      }
    } catch (error) {
      Logger.error('Auth', 'Auto-camera error:', error);
      setStep(3); // Fallback to photo upload screen
    }
  };

  const handleHowItWorksBack = () => {
    setStep(1); // Go back to welcome
  };

  const handlePhotoCapture = async (file: File) => {
    setSelectedImage(file);
    
    // Move to analyzing step immediately for faster UX
    setStep(4);
    
    // Get current user ID for tracking
    const userId = await getCurrentUserId();
    if (!userId) {
      // User not created yet, that's okay - NewWelcomeStep will handle it
      return;
    }
    
    // Save to database in background
    saveOnboardingStep('photo_uploaded', { hasPhoto: true }).catch(console.error);
    trackUserAction('photo_uploaded', { fileSize: file.size, step: 3 }).catch(console.error);
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
      
      // Save analysis data to tables in background (non-blocking)
      const userId = await getCurrentUserId();
      if (userId) {
        saveAnalysisResult(
          analysisResult.imageUrl, 
          analysisResult.analysis, 
          analysisResult.analysis.overallScore
        ).catch(console.error);
         
        saveOnboardingStep('analysis_completed', { 
          score: analysisResult.analysis.overallScore,
          hasAnalysis: true 
        }).catch(console.error);
         
        trackUserAction('analysis_completed', { 
          score: analysisResult.analysis.overallScore,
          breakdown: analysisResult.analysis.breakdown,
          step: 4
        }).catch(console.error);
      }
      
      setAnalysisResult(analysisResult.analysis);
      localStorage.setItem('analysis_result', JSON.stringify(analysisResult.analysis));
      setStep(5); // Go to teaser results
    } catch (error) {
      Logger.error('Auth', 'Analysis failed:', error);
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
    // Move to paywall immediately for faster UX
    setStep(6);
    
    // Save data in background (non-blocking)
    const userId = await getCurrentUserId();
    if (userId) {
      saveOnboardingStep('teaser_viewed', { unlockedAt: new Date().toISOString() }).catch(console.error);
    }
  };

  const handlePaywallComplete = async () => {
    try {
      Logger.userAction('paywall_completed', { step });
      
      // Save completion data to new tables in background (non-blocking)
      const userId = await getCurrentUserId();
      if (userId) {
        saveOnboardingStep('completed', { 
          paymentCompleted: true,
          subscriptionStatus: 'active'
        }).catch(console.error);
        trackUserAction('paywall_completed', { step }).catch(console.error);
      }
      
      // Mark onboarding as completed
      localStorage.setItem('onboarding_completed', 'true');
        
      // Also mark onboarding as completed in database (non-blocking)
      if (userId) {
        (async () => {
          try {
            await supabase
              .from('onboarding_v2')
              .update({
                completed: true,
                completed_at: new Date().toISOString(),
                current_step: 'completed'
              })
              .eq('user_id', userId);
          } catch (error) {
            Logger.error('Auth', 'Error marking onboarding as completed:', error);
          }
        })();
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
        <AnimatePresence mode="wait" initial={false}>
          {step === 1 && (
                         <NewWelcomeStep 
               key="welcome"
               onNext={async () => {
                 // Move to next step immediately for faster UX
                 setStep(2);
                 
                 // Save data in background (non-blocking) - use the userId from state since onUserCreated was called first
                 if (userId) {
                   saveOnboardingStep('welcome_completed', { startedAt: new Date().toISOString() }).catch(console.error);
                 }
               }}
               onUserCreated={(userId) => {
                 setUserId(userId);
                 Logger.info('Auth', 'User created in NewWelcomeStep:', userId);
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
              userImage={selectedImage ? URL.createObjectURL(selectedImage) : undefined}
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
