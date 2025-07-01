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
import { useAuthState } from '@/hooks/useAuthState';
import { useSubscription } from '@/components/subscription/SubscriptionProvider';
import { supabase } from '@/integrations/supabase/client';
import { analyzeStyle } from '@/utils/imageAnalysis';
import { toast } from '@/hooks/use-toast';
import { stepMap } from './data/constants';
import { requestInAppReview } from '@/utils/inAppReview';
import type { OnboardingStep, OnboardingData } from './types';
import type { StyleAnalysisResult } from '@/types/styleTypes';

const totalSteps = 8;

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
  
     const { isAuthenticated, user } = useAuthState();
   const { isPro } = useSubscription();

   // Development helper to reset onboarding
   useEffect(() => {
     (window as any).resetOnboarding = async () => {
       if (!user) return;
       await supabase
         .from('profiles')
         .update({
           age_range: null,
           main_goal: null,
           onboarding_completed: false
         })
         .eq('id', user.id);
       console.log('✅ Onboarding reset! Reload the page.');
       window.location.reload();
     };

     // ADDED: Complete fresh start function
     (window as any).freshStart = async () => {
       console.log('🔄 Starting complete fresh reset...');
       
       // Clear all local storage
       localStorage.clear();
       sessionStorage.clear();
       
       // Sign out from Supabase
       await supabase.auth.signOut();
       
       // Clear any cached data
       if ('caches' in window) {
         const cacheNames = await caches.keys();
         await Promise.all(cacheNames.map(name => caches.delete(name)));
       }
       
       console.log('✅ All data cleared! Redirecting to fresh start...');
       
       // Force reload to completely fresh state
       window.location.href = '/auth';
     };
   }, [user]);

   // Simple save function - no over-engineering
  const saveToSupabase = useCallback(async (data: any) => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...data });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Save failed:', error);
      return false;
    }
  }, [user]);

  // Load existing data on mount - FASTER
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // For unauthenticated users, start with welcome step
      setCurrentStep('welcome');
      return;
    }

    const loadData = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('age_range, main_goal, onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();

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
        console.error('Error loading user data:', error);
        // Fallback to age step on error
        setCurrentStep('age');
      }
    };

    // FASTER: No artificial delay - load immediately
    loadData();
  }, [isAuthenticated, user, isPro, onComplete]);

  // Skip welcome for authenticated users ONLY if they have user data
  useEffect(() => {
    if (isAuthenticated && user && currentStep === 'welcome') {
      setCurrentStep('age');
    }
  }, [isAuthenticated, user, currentStep]);

  // Handle age selection - SIMPLE
  const handleAgeSelect = async (age: string) => {
    const saved = await saveToSupabase({ age_range: age });
    if (saved) {
      setCurrentStep('goal');
    }
  };

  // Handle goal selection - SIMPLE  
  const handleGoalSelect = async (goal: string) => {
    const saved = await saveToSupabase({ main_goal: goal });
    if (saved) {
      setCurrentStep('test-photo');
    }
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

  // Add recovery button for development/debugging
  useEffect(() => {
    (window as any).recoverOnboarding = handleStuckUserRecovery;
  }, [handleStuckUserRecovery]);

  const progress = (stepMap[currentStep] / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4">
        <Progress value={progress} className="h-2 bg-white/20" />
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
  );
};
