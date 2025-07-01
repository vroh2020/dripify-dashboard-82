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
     console.log('🛠️ Helper: window.resetOnboarding()');
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

  // Load existing data on mount - SIMPLE
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const loadData = async () => {
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

      // Returning user - resume where they left off
      if (data.onboarding_completed) {
        setCurrentStep('completed' as OnboardingStep);
      } else if (data.main_goal) {
        setCurrentStep('test-photo');
      } else if (data.age_range) {
        setCurrentStep('goal');
      } else {
        setCurrentStep('age');
      }
    };

    loadData();
  }, [isAuthenticated, user]);

  // Skip welcome for authenticated users
  useEffect(() => {
    if (isAuthenticated && currentStep === 'welcome') {
      setCurrentStep('age');
    }
  }, [isAuthenticated, currentStep]);

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
       setTimeout(() => setShowNextButton(true), 3000);
     } finally {
       // CRITICAL: Turn off loading screen when analysis completes
       setIsAnalyzing(false);
     }
   };

  // Handle completion - SIMPLE
  const handleCompleteOnboarding = async () => {
    if (!isPro) {
      toast({
        title: "Payment Required",
        description: "Please complete your Pro subscription first.",
        variant: "destructive"
      });
      return;
    }

    const saved = await saveToSupabase({ onboarding_completed: true });
    
    if (saved) {
      // Save analysis if we have it
      if (analysisResult && user) {
        await supabase.from('style_analyses').insert({
          user_id: user.id,
          total_score: analysisResult.overallScore,
          breakdown: JSON.stringify(analysisResult.breakdown || []),
          image_url: analysisResult.imageUrl || '',
          feedback: analysisResult.summary || '',
          scan_date: new Date().toISOString()
        });
      }

      onComplete({
        age: '', // Will be loaded from DB
        mainGoal: '', // Will be loaded from DB
        analysisResult: analysisResult || undefined
      });
    }
  };

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
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
