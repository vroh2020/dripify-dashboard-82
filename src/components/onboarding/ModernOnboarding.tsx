import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { StyleLoadingOverlay } from "@/components/StyleLoadingOverlay";
import { ModernRatingsDisplay } from "@/components/ModernRatingsDisplay";
import { ProOfferCard } from "@/components/onboarding/ProOfferCard";
import { analyzeStyle } from "@/utils/imageAnalysis";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { InAppReview } from '@capacitor-community/in-app-review';

// Import step components
import { WelcomeStep } from "./steps/WelcomeStep";
import { AgeStep } from "./steps/AgeStep";
import { GoalStep } from "./steps/GoalStep";
import { TestPhotoStep } from "./steps/TestPhotoStep";
import { CelebrationStep } from "./steps/CelebrationStep";
import { TrialOfferStep } from "./steps/TrialOfferStep";

// Import types and constants
import { OnboardingData, StyleAnalysisResult, OnboardingStep } from "./types";
import { stepMap, totalSteps } from "./data/constants";

interface ModernOnboardingProps {
  onComplete: (userData: OnboardingData) => void;
}

export const ModernOnboarding = ({ onComplete }: ModernOnboardingProps) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<StyleAnalysisResult | null>(null);
  const [showNextButton, setShowNextButton] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const { toast } = useToast();
  const { isPro } = useSubscription();

  // Progress calculation
  const progress = (stepMap[currentStep] / totalSteps) * 100;

  // Step handlers
  const handleAgeSelect = (age: string) => {
    setOnboardingData(prev => ({ ...prev, age }));
    setCurrentStep('goal');
  };

  const handleGoalSelect = (goal: string) => {
    setOnboardingData(prev => ({ ...prev, mainGoal: goal }));
    setCurrentStep('test-photo');
  };

  const handleImageUpload = async () => {
    if (!selectedImage || isAnalyzing) return;

    try {
      setIsAnalyzing(true);
      setCurrentStep('rating');

      console.log('🎯 Onboarding: Starting REAL AI analysis...');
      
      // Use REAL AI analysis - same as main scan
      const realAnalysisResult = await analyzeStyle(selectedImage, true);
      
      console.log('🎯 Onboarding: Real AI analysis completed:', realAnalysisResult);
      
      setAnalysisResult(realAnalysisResult);
      
      setTimeout(() => {
        setShowNextButton(true);
        
        try {
          InAppReview.requestReview().catch(error => {
            console.log('In-app review request failed (this is normal):', error);
          });
        } catch (error) {
          console.log('In-app review not available:', error);
        }
      }, 8000);
    } catch (error) {
      console.error('🎯 Onboarding: Analysis error:', error);
      
      // Only fallback to demo if real analysis completely fails
      const demoResult = {
        overallScore: 86,
        rawAnalysis: "Demo analysis for onboarding",
        imageUrl: URL.createObjectURL(selectedImage),
        summary: "Looking great! Your style shows good attention to detail and coordination.",
        breakdown: [
          { category: "Overall Style", score: 86, emoji: "✨" }
        ],
        tips: []
      };
      
      setAnalysisResult(demoResult);
      
      setTimeout(() => {
        setShowNextButton(true);
      }, 2000);
      
      toast({
        title: "Analysis completed with demo data",
        description: "The AI analysis encountered an issue, but we've provided sample results.",
        variant: "default"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalysisTimeout = () => {
    console.log('🎯 Onboarding: Analysis timeout triggered');
    setIsAnalyzing(false);
    toast({
      title: "Analysis timed out",
      description: "The style analysis is taking too long. Please try again with a different image.",
      variant: "destructive",
    });
  };

  const handleCompleteOnboarding = async () => {
    if (isCompleting) return;
    
    setIsCompleting(true);
    
    try {
      console.log('Completing onboarding with data:', onboardingData);
      
      // Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('No authenticated user, redirecting to complete onboarding');
        
        // Store onboarding data in localStorage for after auth
        localStorage.setItem('pendingOnboardingData', JSON.stringify({
          ...onboardingData,
          analysisResult
        }));
        
        onComplete({
          ...onboardingData,
          analysisResult,
          requiresAuth: true
        });
        return;
      }

      // User is authenticated, save onboarding data to profile
      console.log('Saving onboarding data for user:', user.id);
      
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          age_range: onboardingData.age,
          main_goal: onboardingData.mainGoal,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Error saving profile data:', profileError);
        toast({
          title: "Profile Save Error",
          description: "Your preferences were saved locally. You can update them later in settings.",
          variant: "default"
        });
      } else {
        console.log('Profile data saved successfully');
        
        // Save style analysis if we have results
        if (analysisResult && analysisResult.overallScore) {
          const { error: analysisError } = await supabase
            .from('style_analyses')
            .insert({
              user_id: user.id,
              total_score: analysisResult.overallScore,
              breakdown: JSON.stringify(analysisResult.breakdown || []),
              feedback: analysisResult.summary || "Great style analysis!",
              tips: JSON.stringify(analysisResult.tips || []),
              raw_analysis: analysisResult.rawAnalysis || "Onboarding analysis",
              image_url: null // Don't store the blob URL
            });
          
          if (analysisError) {
            console.error('Error saving analysis:', analysisError);
          }
        }
      }
      
      // Clear any pending onboarding data
      localStorage.removeItem('pendingOnboardingData');
      
      toast({
        title: "Welcome to DripMax! 🎉",
        description: "Your style journey begins now!"
      });
      
      onComplete({
        ...onboardingData,
        analysisResult
      });
      
    } catch (error) {
      console.error('Error in handleCompleteOnboarding:', error);
      
      // Fallback - complete onboarding anyway
      onComplete({
        ...onboardingData,
        analysisResult
      });
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-[#1A1F2C] via-[#2C1F3D] to-[#1A1F2C]">
      {/* Progress Bar */}
      <div className="w-full px-6 pt-safe-area-top pt-12 pb-4">
        <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
        </div>
        <div className="text-center mt-2">
          <span className="text-white/60 text-xs font-medium">
            Step {stepMap[currentStep]} of {totalSteps}
          </span>
        </div>
      </div>

      {/* Main Content - Scrollable Container */}
      <div className="flex-1 px-4 pb-safe-area-bottom pb-4">
        <Card className="min-h-[calc(100vh-140px)] min-h-[calc(100dvh-140px)] backdrop-blur-xl bg-black/40 border-white/10 shadow-2xl rounded-3xl">
          <CardContent className="p-0 h-full relative">
            {/* Style Loading Overlay with timeout */}
            <StyleLoadingOverlay 
              isAnalyzing={isAnalyzing} 
              onTimeout={handleAnalysisTimeout}
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

                {currentStep === 'rating' && (
                  <motion.div
                    key="rating"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full flex flex-col"
                  >
                    <div className="flex-1 flex items-center justify-center px-6 py-8">
                      {analysisResult && (
                        <ModernRatingsDisplay
                          overallScore={analysisResult.overallScore}
                          profileImage={analysisResult.imageUrl}
                          breakdown={analysisResult.breakdown || []}
                          isOnboarding={true}
                        />
                      )}
                    </div>
                    
                    {showNextButton && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="px-6 pb-8"
                      >
                        <button
                          onClick={() => setCurrentStep('celebration')}
                          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-14 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl text-white"
                        >
                          Continue
                        </button>
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
                  <TrialOfferStep onNext={() => setCurrentStep('paywall')} />
                )}

                {currentStep === 'paywall' && (
                  <motion.div
                    key="paywall"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full flex items-center justify-center px-6 py-8"
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
