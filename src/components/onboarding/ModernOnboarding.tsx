import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { WelcomeStep } from './steps/WelcomeStep';
import { AgeStep } from './steps/AgeStep';
import { GoalStep } from './steps/GoalStep';
import { TestPhotoStep } from './steps/TestPhotoStep';
import { CelebrationStep } from './steps/CelebrationStep';
import { TrialOfferStep } from './steps/TrialOfferStep';
import { ProOfferCard } from './ProOfferCard';
import { StyleLoadingOverlay } from '@/components/StyleLoadingOverlay';
import { ModernRatingsDisplay } from '@/components/ModernRatingsDisplay';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/components/subscription/SubscriptionProvider';
import { supabase } from '@/integrations/supabase/client';
import { analyzeStyle } from '@/utils/imageAnalysis';
import { toast } from '@/hooks/use-toast';
import { stepMap, totalSteps } from './data/constants';
import { requestInAppReview } from '@/utils/inAppReview';
import type { OnboardingStep, OnboardingData } from './types';
import type { StyleAnalysisResult } from '@/types/styleTypes';
import { useToast } from '@/components/ui/use-toast';
import { useRevenueCatManager } from '@/hooks/useRevenueCatManager';

interface ModernOnboardingProps {
  onComplete: (userData: OnboardingData) => void;
}

export const ModernOnboarding = ({ onComplete }: ModernOnboardingProps) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<StyleAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const { toast } = useToast();

  // CRITICAL FIX: Add error state management
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const { isAuthenticated, user } = useAuth();
  const { subscription, isLoading: isRevenueCatLoading } = useRevenueCatManager();
  const isPro = subscription.isActive;

  // Helper function to get current step number
  const getCurrentStepNumber = useCallback(() => {
    return stepMap[currentStep] || 1;
  }, [currentStep]);

  // Simple save function - ENHANCED with better error handling
  const saveToSupabase = useCallback(async (data: any, retryCount = 0) => {
    if (!user) return false;
    
    const maxRetries = 3;
    setSaveError(null);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...data });
      
      if (error) throw error;
      console.log('✅ Save successful:', data);
      return true;
    } catch (error: any) {
      console.error('Save failed:', error);
      
      // Determine if this is a retryable error
      const isRetryable = error.code === 'PGRST301' || // RLS policy violation (might be temporary)
                         error.message?.includes('timeout') ||
                         error.message?.includes('network') ||
                         error.status >= 500; // Server errors
      
      if (isRetryable && retryCount < maxRetries) {
        console.log(`🔄 Retrying save (attempt ${retryCount + 1}/${maxRetries + 1})...`);
        setIsRetrying(true);
        
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        
        setIsRetrying(false);
        return saveToSupabase(data, retryCount + 1);
      }
      
      // Show user-friendly error message
      const errorMessage = error.message?.includes('RLS') 
        ? 'Permission error. Please try signing out and back in.'
        : error.status >= 500
        ? 'Server temporarily unavailable. Please try again.'
        : error.message?.includes('network')
        ? 'Network connection issue. Please check your internet.'
        : 'Failed to save progress. Please try again.';
      
      setSaveError(errorMessage);
      
      toast({
        title: "Save Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      return false;
    }
  }, [user, toast]);

  // Load existing data on mount - FASTER
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // For unauthenticated users, start with welcome step
      setCurrentStep('welcome');
      return;
    }

    const loadData = async () => {
      setSaveError(null); // Clear any previous errors
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('age_range, main_goal, onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading user data:', error);
          
          // Show user-friendly error message
          const errorMessage = error.code === 'PGRST116' 
            ? 'Profile not found. Starting fresh onboarding.'
            : error.message?.includes('RLS')
            ? 'Permission error loading your data. Please try signing out and back in.'
            : 'Failed to load your progress. Starting from the beginning.';
            
          setSaveError(errorMessage);
          toast({
            title: "Loading Issue",
            description: errorMessage,
            variant: "destructive"
          });
          
          // Fallback to fresh start
          setCurrentStep('age');
          return;
        }

        if (!data) {
          // New user - start fresh
          setCurrentStep('age');
          return;
        }

        // FIXED: Handle completed onboarding users properly
        if (data.onboarding_completed) {
          if (isPro) {
            // User has completed onboarding AND has subscription - complete flow
            onComplete({
              age: data.age_range || '',
              mainGoal: data.main_goal || '',
              analysisResult: undefined
            });
          } else {
            // User completed onboarding but NO subscription - go to payment
            console.log('🔄 User completed onboarding but needs subscription - redirecting to payment');
            setCurrentStep('trial-offer');
          }
          return;
        }

        // Returning user - resume where they left off
        if (data.main_goal) {
          setCurrentStep('test-photo');
        } else if (data.age_range) {
          setCurrentStep('goal');
        } else {
          setCurrentStep('age');
        }
      } catch (error) {
        console.error('Critical error loading user data:', error);
        setSaveError('Unable to load your data. Please check your connection and try again.');
        toast({
          title: "Connection Error",
          description: "Unable to load your data. Please check your connection and try again.",
          variant: "destructive"
        });
        // Fallback to age step on error
        setCurrentStep('age');
      }
    };

    // FASTER: No artificial delay - load immediately
    loadData();
  }, [isAuthenticated, user, isPro, onComplete, toast]);

  // Skip welcome for authenticated users ONLY if they have user data
  useEffect(() => {
    if (isAuthenticated && user && currentStep === 'welcome') {
      setCurrentStep('age');
    }
  }, [isAuthenticated, user, currentStep]);

  // Handle age selection - ENHANCED with error handling
  const handleAgeSelect = async (age: string) => {
    setSaveError(null); // Clear previous errors
    const saved = await saveToSupabase({ age_range: age });
    if (saved) {
      setCurrentStep('goal');
    }
    // Error handling is done in saveToSupabase function
  };

  // Handle goal selection - ENHANCED with error handling  
  const handleGoalSelect = async (goal: string) => {
    setSaveError(null); // Clear previous errors
    const saved = await saveToSupabase({ main_goal: goal });
    if (saved) {
      setCurrentStep('test-photo');
    }
    // Error handling is done in saveToSupabase function
  };

     // Handle image upload
   const handleImageUpload = async () => {
     if (!selectedImage || isAnalyzing) return;

     try {
       setIsAnalyzing(true);
       setCurrentStep('rating');

       const result = await analyzeStyle(selectedImage, true);
       setAnalysisResult(result);
       
       // Request in-app review after user sees their results (4 seconds)
       setTimeout(() => {
         requestInAppReview();
       }, 4000);
       
       // Show continue button after review prompt has time to appear (8 seconds)
       setTimeout(() => setShowNextButton(true), 8000);
     } catch (error) {
       console.error('Analysis failed:', error);
       // Continue with demo result
       setAnalysisResult({
         overallScore: 86,
         rawAnalysis: "Demo analysis",
         imageUrl: URL.createObjectURL(selectedImage),
         summary: "Looking great! Your style shows good attention to detail.",
         breakdown: [],
         tips: []
       });
       
       // Request in-app review for demo result too (1.5 seconds)
       setTimeout(() => {
         requestInAppReview();
       }, 1500);
       
       setTimeout(() => setShowNextButton(true), 3000);
     } finally {
       // CRITICAL: Turn off loading screen when analysis completes
       setIsAnalyzing(false);
     }
   };

  // Handle completion - ENHANCED WITH VALIDATION
  const handleCompleteOnboarding = async () => {
    if (isCompleting) return; // Prevent double-execution
    
    setIsCompleting(true);
    
    try {
      // Enhanced validation before completion
      if (!isPro) {
        console.log('❌ Completion blocked: User is not Pro');
        toast({
          title: "Subscription Required",
          description: "Please complete your Pro subscription to continue.",
          variant: "destructive"
        });
        
        // Redirect back to payment flow
        setCurrentStep('trial-offer');
        return;
      }

      // Validate required onboarding data
      if (!user) {
        console.log('❌ Completion blocked: No user found');
        toast({
          title: "Authentication Issue",
          description: "Please sign in again to continue.",
          variant: "destructive"
        });
        return;
      }

      // Check if user has completed required steps
      const { data: profile } = await supabase
        .from('profiles')
        .select('age_range, main_goal')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.age_range || !profile?.main_goal) {
        console.log('❌ Completion blocked: Missing required profile data');
        toast({
          title: "Missing Information",
          description: "Please complete all onboarding steps first.",
          variant: "destructive"
        });
        
        // Redirect to missing step
        if (!profile?.age_range) {
          setCurrentStep('age');
        } else if (!profile?.main_goal) {
          setCurrentStep('goal');
        }
        return;
      }

      console.log('✅ All validation passed - completing onboarding');
      
      // Save completion flag
      const saved = await saveToSupabase({ onboarding_completed: true });
      
      if (!saved) {
        toast({
          title: "Save Failed",
          description: "Failed to save progress. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Save analysis if we have it
      if (analysisResult && user) {
        try {
          await supabase.from('style_analyses').insert({
            user_id: user.id,
            total_score: analysisResult.overallScore,
            breakdown: JSON.stringify(analysisResult.breakdown || []),
            image_url: analysisResult.imageUrl || '',
            feedback: analysisResult.summary || '',
            scan_date: new Date().toISOString()
          });
        } catch (error) {
          console.log('Analysis save failed (non-critical):', error);
        }
      }

      // Success - complete the onboarding
      onComplete({
        age: profile.age_range,
        mainGoal: profile.main_goal,
        analysisResult: analysisResult || undefined
      });
      
    } catch (error) {
      console.error('Completion error:', error);
      toast({
        title: "Completion Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCompleting(false);
    }
  };

  // Enhanced recovery function for stuck users
  const handleStuckUserRecovery = useCallback(async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('age_range, main_goal, onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        // New user - start fresh
        setCurrentStep('age');
        return;
      }

      // FIXED: Proper handling of completed onboarding
      if (profile.onboarding_completed) {
        if (isPro) {
          // Has both onboarding and subscription - complete immediately
          onComplete({
            age: profile.age_range || '',
            mainGoal: profile.main_goal || '',
            analysisResult: undefined
          });
        } else {
          // Completed onboarding but no subscription - needs payment
          console.log('🔄 Recovery: Directing completed user to payment');
          setCurrentStep('trial-offer');
        }
        return;
      }

      // Resume from correct step
      if (!profile.age_range) {
        setCurrentStep('age');
      } else if (!profile.main_goal) {
        setCurrentStep('goal');
      } else {
        // Has data but not completed - go to photo step
        setCurrentStep('test-photo');
      }
    } catch (error) {
      console.error('Recovery failed:', error);
      // Fallback to age step
      setCurrentStep('age');
    }
  }, [user, isPro, onComplete]);

  // Recovery function available for internal use only

  const progress = (stepMap[currentStep] / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-black/20" />
      
      <div className="relative z-10 h-full">
        {/* Header with progress and error state */}
        <div className="relative px-8 pt-12 pb-4">
          {/* Error Banner - CRITICAL FIX: Show error state to users */}
          {(saveError || isRetrying) && (
            <div className="mb-4 p-4 rounded-xl border-2 bg-red-500/10 border-red-500/30 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                {isRetrying ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full" />
                    <div className="text-orange-300">
                      <p className="font-medium">Retrying...</p>
                      <p className="text-sm text-orange-300/70">Please wait while we save your progress</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-red-400 text-xl">⚠️</div>
                    <div className="text-red-300">
                      <p className="font-medium">Something went wrong</p>
                      <p className="text-sm text-red-300/70">{saveError}</p>
                    </div>
                  </>
                )}
              </div>
              
              {saveError && !isRetrying && (
                <button
                  onClick={() => {
                    setSaveError(null);
                    // Retry the last action based on current step
                    if (currentStep === 'age') {
                      // No retry needed for age step
                    } else if (currentStep === 'goal') {
                      toast({
                        title: "Please select your age again",
                        description: "Your previous selection didn't save properly."
                      });
                      setCurrentStep('age');
                    }
                  }}
                  className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          )}
          
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/60 text-sm">Step {getCurrentStepNumber()} of {totalSteps}</span>
              <span className="text-white/60 text-sm">{Math.round((getCurrentStepNumber() / totalSteps) * 100)}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 backdrop-blur-sm">
              <div 
                className="bg-gradient-to-r from-orange-500 to-orange-400 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(getCurrentStepNumber() / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 z-50 p-4">
          <div className="w-full bg-white/10 rounded-full h-2 backdrop-blur-sm">
            <div 
              className="bg-gradient-to-r from-orange-500 to-orange-400 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(getCurrentStepNumber() / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex-1 px-4 pb-4 pt-16">
          <Card className="min-h-[calc(100vh-80px)] backdrop-blur-xl bg-black/40 border-white/10 shadow-2xl rounded-3xl">
            <CardContent className="p-0 h-full relative">
              <StyleLoadingOverlay 
                isAnalyzing={isAnalyzing} 
                timeoutDuration={90000}
              />
              
              <div className="h-full overflow-y-auto">
                <AnimatePresence mode="wait">
                  {currentStep === 'welcome' && (
                    <WelcomeStep onNext={() => setCurrentStep('age')} />
                  )}

                  {currentStep === 'age' && (
                    <AgeStep onAgeSelect={handleAgeSelect} />
                  )}

                  {currentStep === 'goal' && (
                    <GoalStep onGoalSelect={handleGoalSelect} />
                  )}

                  {currentStep === 'test-photo' && (
                    <TestPhotoStep 
                      selectedImage={selectedImage}
                      onImageSelect={setSelectedImage}
                      onImageUpload={handleImageUpload}
                    />
                  )}

                  {currentStep === 'rating' && analysisResult && (
                    <motion.div
                      key="rating"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -30 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="h-full flex flex-col"
                    >
                      <div className="flex-1 flex items-center justify-center px-6 py-8">
                        <ModernRatingsDisplay
                          overallScore={analysisResult.overallScore}
                          profileImage={analysisResult.imageUrl}
                          breakdown={analysisResult.breakdown || []}
                          isOnboarding={true}
                        />
                      </div>
                      
                      {showNextButton && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5 }}
                          className="px-6 pb-8"
                        >
                          <Button
                            onClick={() => setCurrentStep('celebration')}
                            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-14 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl text-white"
                          >
                            Continue
                          </Button>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {currentStep === 'celebration' && (
                    <CelebrationStep
                      isPro={isPro}
                      onNext={() => setCurrentStep('trial-offer')}
                      onComplete={handleCompleteOnboarding}
                    />
                  )}

                  {currentStep === 'trial-offer' && (
                    <TrialOfferStep 
                      onNext={() => setCurrentStep('paywall')}
                    />
                  )}

                  {currentStep === 'paywall' && (
                    <motion.div
                      key="paywall"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex items-center justify-center p-6"
                    >
                      <ProOfferCard onContinue={handleCompleteOnboarding} />
                    </motion.div>
                  )}
                  
                  {/* Enhanced fallback with recovery options */}
                  {!['welcome', 'age', 'goal', 'test-photo', 'rating', 'celebration', 'trial-offer', 'paywall'].includes(currentStep) && (
                    <motion.div
                      key="fallback"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex items-center justify-center p-6"
                    >
                      <div className="text-center text-white space-y-4">
                        <p className="mb-4 text-lg">Something went wrong with the onboarding flow.</p>
                        <p className="mb-6 text-white/70">Current step: {currentStep}</p>
                        
                        <div className="space-y-3">
                          <Button 
                            onClick={handleStuckUserRecovery}
                            className="w-full bg-orange-500 hover:bg-orange-600"
                          >
                            Smart Recovery
                          </Button>
                          
                          <Button 
                            onClick={() => setCurrentStep('age')}
                            variant="outline"
                            className="w-full border-white/20 text-white hover:bg-white/10"
                          >
                            Start Over
                          </Button>
                        </div>
                        
                        <p className="text-xs text-white/50 mt-4">
                          If this keeps happening, email support@dripmax.com
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
