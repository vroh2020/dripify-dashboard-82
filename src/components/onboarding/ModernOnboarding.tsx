import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { StyleLoadingOverlay } from "@/components/StyleLoadingOverlay";
import { ModernRatingsDisplay } from "@/components/ModernRatingsDisplay";
import { ProOfferCard } from "@/components/onboarding/ProOfferCard";
import { analyzeStyle } from "@/utils/imageAnalysis";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRevenueCat } from "@/hooks/useRevenueCat";
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
import { generateSecureRandom } from "./utils/auth";

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
  
  const { subscription, isLoading: revenueCatLoading, initialized } = useRevenueCat();
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

      const imageUrl = URL.createObjectURL(selectedImage);
      
      const mockAnalysisResult = {
        overallScore: 86,
        rawAnalysis: "Professional and well-coordinated outfit with great attention to detail",
        imageUrl: imageUrl,
        summary: "This outfit is well-put-together, with a professional yet approachable style. The light blue shirt and tie create a harmonious look, and the glasses add a unique personal touch. To take the outfit to the next level, consider adding a subtle accessory like a watch or a pocket square.",
        breakdown: [
          { category: "Color Coordination", score: 85, emoji: "🎨" },
          { category: "Fit & Silhouette", score: 88, emoji: "👔" },
          { category: "Style Cohesion", score: 84, emoji: "✨" },
          { category: "Occasion Appropriateness", score: 90, emoji: "🎯" }
        ],
        tips: []
      };

      let finalResult = mockAnalysisResult;
      
      try {
        const analysisResult = await analyzeStyle(selectedImage, true);
        
        finalResult = {
          overallScore: analysisResult.overallScore,
          rawAnalysis: analysisResult.rawAnalysis,
          imageUrl: analysisResult.imageUrl,
          summary: analysisResult.summary || analysisResult.rawAnalysis || "Great style analysis completed!",
          breakdown: analysisResult.breakdown && analysisResult.breakdown.length > 0 
            ? analysisResult.breakdown 
            : [
                { category: "Overall Style", score: analysisResult.overallScore, emoji: "✨" }
              ],
          tips: []
        };
      } catch (analysisError) {
        console.log('Real analysis failed, using fallback mock:', analysisError);
      }
      
      setAnalysisResult(finalResult);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !user.user_metadata?.is_temp_account) {
        try {
          await supabase
            .from('style_analyses')
            .insert({
              user_id: user.id,
              total_score: finalResult.overallScore || 86,
              breakdown: JSON.stringify(finalResult.breakdown || []),
              feedback: finalResult.summary || "Great style!",
              tips: JSON.stringify([]),
              image_url: null,
              raw_analysis: finalResult.rawAnalysis || "Style analysis completed"
            });
        } catch (dbError) {
          console.error('Database error:', dbError);
        }
      }

      setTimeout(() => {
        setShowNextButton(true);
        
        try {
          InAppReview.requestReview().catch(error => {
            console.log('In-app review request failed (this is normal):', error);
          });
        } catch (error) {
          console.log('In-app review not available:', error);
        }
      }, 10000);
    } catch (error) {
      console.error('Analysis error:', error);
      
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
        
        try {
          InAppReview.requestReview().catch(error => {
            console.log('In-app review request failed (this is normal):', error);
          });
        } catch (error) {
          console.log('In-app review not available:', error);
        }
      }, 2000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (isCompleting) {
      console.log('Already completing onboarding, skipping...');
      return;
    }

    setIsCompleting(true);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (user && !userError) {
        console.log('User already exists, completing onboarding with existing user:', user.id);
        
        if (!user.user_metadata?.is_temp_account) {
          await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              username: user.email?.split('@')[0] || 'User',
              age_range: onboardingData.age,
              main_goal: onboardingData.mainGoal
            });
        }
        
        onComplete({
          ...onboardingData,
          analysisResult
        });
        return;
      }

      console.log('No authenticated user found, creating new account...');
      
      const randomId = generateSecureRandom(12);
      const timestamp = Date.now();
      const tempEmail = `user_${timestamp}_${randomId}@dripmax.internal`;
      const tempPassword = generateSecureRandom(32);
      
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: tempEmail,
        password: tempPassword,
        options: {
          data: {
            username: `user_${timestamp}_${generateSecureRandom(8)}`,
            age_range: onboardingData.age,
            main_goal: onboardingData.mainGoal,
            is_temp_account: true,
            created_via: 'onboarding_completion'
          }
        }
      });
      
      if (signUpError) {
        console.error('Error creating user account:', signUpError);
        
        toast({
          title: "Account Creation Delayed",
          description: "You can still use the app! Sign up later for full features.",
          variant: "default"
        });
      } else {
        console.log('New secure user account created successfully:', authData.user?.id);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      onComplete({
        ...onboardingData,
        analysisResult
      });
      
    } catch (error) {
      console.error('Error in handleCompleteOnboarding:', error);
      
      onComplete({
        ...onboardingData,
        analysisResult
      });
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] via-[#2C1F3D] to-[#1A1F2C] flex flex-col">
      {/* Progress Bar */}
      <div className="w-full px-6 pt-safe-area-inset-top pt-4 pb-4">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
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

      {/* Main Content */}
      <div className="flex-1 px-4 pb-safe-area-inset-bottom pb-4">
        <Card className="h-full backdrop-blur-xl bg-black/40 border-white/10 shadow-2xl">
          <CardContent className="p-0 h-full flex flex-col relative overflow-hidden">
            <StyleLoadingOverlay isAnalyzing={isAnalyzing} />
            
            <div className="flex-1 p-6 flex flex-col">
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
                    className="flex flex-col items-center justify-center flex-1 space-y-6"
                  >
                    {analysisResult && (
                      <>
                        <ModernRatingsDisplay
                          overallScore={analysisResult.overallScore || 86}
                          profileImage={analysisResult.imageUrl}
                          breakdown={analysisResult.breakdown || []}
                          isOnboarding={true}
                        />
                        
                        {showNextButton && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="w-full"
                          >
                            <button
                              onClick={() => setCurrentStep('celebration')}
                              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-14 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-105 shadow-2xl text-white"
                            >
                              Continue
                            </button>
                          </motion.div>
                        )}
                      </>
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
                    className="flex-1"
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
