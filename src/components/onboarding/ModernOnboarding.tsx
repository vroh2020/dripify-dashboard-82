import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ImageUpload } from "@/components/ImageUpload";
import { StyleLoadingOverlay } from "@/components/StyleLoadingOverlay";
import { DripScore } from "@/components/DripScore";
import { ModernRatingsDisplay } from "@/components/ModernRatingsDisplay";
import { ProOfferCard } from "@/components/onboarding/ProOfferCard";
import { analyzeStyle } from "@/utils/imageAnalysis";
import { parseAnalysis } from "@/utils/analysisParser";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { Sparkles, PartyPopper, Crown, Apple, TrendingUp, Ruler, Palette, Star, Zap } from "lucide-react";
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { Capacitor } from '@capacitor/core';
import { InAppReview } from '@capacitor-community/in-app-review';

interface OnboardingData {
  age?: string;
  referralSource?: string;
  mainGoal?: string;
  analysisResult?: StyleAnalysisResult;
}

interface StyleAnalysisResult {
  overallScore: number;
  rawAnalysis: string;
  imageUrl: string;
  summary?: string;
  breakdown?: Array<{
    category: string;
    score: number;
    emoji: string;
  }>;
  tips?: Array<{
    category: string;
    tip: string;
  }>;
}

interface ModernOnboardingProps {
  onComplete: (userData: OnboardingData) => void;
}

type OnboardingStep = 
  | 'welcome' 
  | 'age' 
  | 'goal' 
  | 'test-photo' 
  | 'rating' 
  | 'celebration' 
  | 'trial-offer' 
  | 'trial-reminder'
  | 'pricing'
  | 'paywall';

// Secure random generation utility
const generateSecureRandom = (length: number = 16): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += charset[values[i] % charset.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += charset[Math.floor(Math.random() * charset.length)];
    }
  }
  
  return result;
};

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
  const totalSteps = 9;
  const stepMap = {
    'welcome': 1,
    'age': 2,
    'goal': 3,
    'test-photo': 4,
    'rating': 5,
    'celebration': 6,
    'trial-offer': 7,
    'trial-reminder': 8,
    'pricing': 9,
    'paywall': 10
  };
  const progress = (stepMap[currentStep] / totalSteps) * 100;

  // Options data
  const ageOptions = [
    "16-20", "21-25", "26-30", "31-35", 
    "36-40", "41-45", "46-50", "50+"
  ];

  const goalOptions = [
    { id: "get-drippy", title: "Get Drippy", description: "Elevate my style game", emoji: "🔥" },
    { id: "find-outfits", title: "Find Good Outfits", description: "Discover what looks good on me", emoji: "👔" },
    { id: "get-partner", title: "Trying to get a BF/GF", description: "Look attractive for dating", emoji: "💕" },
    { id: "drip-max", title: "Drip Max", description: "Become a style icon", emoji: "🏆" }
  ];

  // Apple Sign In Handler
  const handleAppleSignIn = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const options = {
          clientId: 'com.dripmax.app',
          redirectURI: 'https://jjqwhxamjxsiotnhhqco.supabase.co/auth/v1/callback',
          scopes: 'email name',
          state: generateSecureRandom(10),
          nonce: generateSecureRandom(10),
        };

        const result = await SignInWithApple.authorize(options);
        
        if (result.response.identityToken) {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: result.response.identityToken,
          });
          
          if (error) throw error;
          setCurrentStep('age');
        }
      } else {
        setCurrentStep('age');
      }
    } catch (error) {
      console.error('Apple Sign In error:', error);
      setCurrentStep('age');
    }
  };

  // Continue with email (temp account)
  const handleContinueWithEmail = async () => {
    try {
      const randomId = generateSecureRandom(12);
      const timestamp = Date.now();
      const tempEmail = `temp_${timestamp}_${randomId}@dripmax.internal`;
      const tempPassword = generateSecureRandom(24);
      
      const { data, error } = await supabase.auth.signUp({
        email: tempEmail,
        password: tempPassword,
        options: {
          data: {
            username: `user_${timestamp}_${generateSecureRandom(8)}`,
            is_temp_account: true,
            created_via: 'onboarding_flow'
          }
        }
      });

      if (error) {
        console.error('Temp account error:', error);
      }
      
      setCurrentStep('age');
    } catch (error) {
      console.error('Error creating temp account:', error);
      setCurrentStep('age');
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] via-[#2C1F3D] to-[#1A1F2C] flex items-center justify-center p-4">
      {/* Fixed Container - Prevents Flickering */}
      <div className="w-full max-w-sm mx-auto">
        {/* Progress Bar - Fixed Position */}
        <div className="mb-8">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 to-orange-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            />
          </div>
          <div className="text-center mt-3">
            <span className="text-white/60 text-sm font-medium">
              Step {stepMap[currentStep]} of {totalSteps}
            </span>
          </div>
        </div>

        {/* Main Card - Fixed Height to Prevent Flickering */}
        <Card className="backdrop-blur-xl bg-black/40 border-white/10 shadow-2xl h-[600px] flex flex-col">
          <CardContent className="p-8 flex-1 flex flex-col justify-center relative overflow-hidden">
            <StyleLoadingOverlay isAnalyzing={isAnalyzing} />
            
            <AnimatePresence mode="wait">
              {/* Welcome Step */}
              {currentStep === 'welcome' && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="text-center space-y-8 flex flex-col justify-center h-full"
                >
                  <div className="space-y-6">
                    <motion.div
                      animate={{ 
                        rotate: [0, 5, -5, 0],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{ 
                        duration: 3, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="text-7xl mb-4"
                    >
                      🧑‍🎤
                    </motion.div>
                    
                    <div className="space-y-4">
                      <h1 className="text-4xl font-bold text-white leading-tight">
                        Welcome to{" "}
                        <span className="bg-gradient-to-r from-orange-400 to-orange-500 text-transparent bg-clip-text">
                          Drip Max
                        </span>
                      </h1>
                      <p className="text-white/80 text-lg leading-relaxed">
                        Your AI stylist is here!<br />
                        Get instant style ratings & become the best dressed you.
                      </p>
                    </div>

                    {/* Preview Card */}
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 rounded-2xl p-6 border border-white/10"
                    >
                      <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Star className="text-white text-2xl" />
                          </div>
                          <div className="text-left">
                            <div className="text-white font-semibold text-lg">Your Rating</div>
                            <div className="text-white/60">Overall Style</div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-4xl font-bold text-white">86</div>
                          <div className="w-16 h-3 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full"></div>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  <div className="space-y-4">
                    <Button
                      onClick={handleAppleSignIn}
                      className="w-full bg-black hover:bg-gray-900 text-white h-14 text-lg font-semibold rounded-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center shadow-xl"
                    >
                      <Apple className="mr-3 h-6 w-6" />
                      Continue with Apple
                    </Button>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/20"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-6 bg-black/40 text-white/60 font-medium">or</span>
                      </div>
                    </div>
                    
                    <Button
                      onClick={handleContinueWithEmail}
                      className="w-full bg-white/10 border-2 border-white/20 text-white hover:bg-white/20 hover:border-white/30 h-14 text-lg font-semibold rounded-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                    >
                      Continue with Email
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Age Step */}
              {currentStep === 'age' && (
                <motion.div
                  key="age"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="text-center space-y-8 flex flex-col justify-center h-full"
                >
                  <div className="space-y-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="text-6xl mb-4"
                    >
                      🎂
                    </motion.div>
                    <h2 className="text-3xl font-bold text-white">What's your age?</h2>
                    <p className="text-white/70 text-lg">Help us personalize your style experience</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {ageOptions.map((age, index) => (
                      <motion.div
                        key={age}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.4 }}
                      >
                        <Button
                          onClick={() => handleAgeSelect(age)}
                          className="w-full h-16 text-xl font-bold bg-white/10 border-2 border-white/20 text-white hover:bg-gradient-to-r hover:from-orange-500/30 hover:to-orange-400/30 hover:border-orange-500/70 hover:scale-105 transition-all duration-300 rounded-2xl backdrop-blur-sm"
                        >
                          {age}
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Goal Step */}
              {currentStep === 'goal' && (
                <motion.div
                  key="goal"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="text-center space-y-8 flex flex-col justify-center h-full"
                >
                  <div className="space-y-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="text-6xl mb-4"
                    >
                      🎯
                    </motion.div>
                    <h2 className="text-3xl font-bold text-white">What's your main goal?</h2>
                    <p className="text-white/70 text-lg">Let us know what you want to achieve</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {goalOptions.map((goal, index) => (
                      <motion.div
                        key={goal.id}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.15, duration: 0.5 }}
                      >
                        <Button
                          onClick={() => handleGoalSelect(goal.id)}
                          className="w-full h-20 bg-white/10 border-2 border-white/20 text-white hover:bg-gradient-to-r hover:from-orange-500/30 hover:to-orange-400/30 hover:border-orange-500/70 hover:scale-105 transition-all duration-300 rounded-2xl backdrop-blur-sm flex items-center justify-start p-6"
                        >
                          <span className="text-3xl mr-4">{goal.emoji}</span>
                          <div className="text-left">
                            <div className="font-bold text-lg">{goal.title}</div>
                            <div className="text-white/70 text-sm">{goal.description}</div>
                          </div>
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Test Photo Step */}
              {currentStep === 'test-photo' && (
                <motion.div
                  key="test-photo"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="text-center space-y-8 flex flex-col justify-center h-full"
                >
                  <div className="space-y-6">
                    <motion.div
                      animate={{ 
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Sparkles className="w-20 h-20 text-orange-400 mx-auto" />
                    </motion.div>
                    <h2 className="text-3xl font-bold text-white">Let's test it out!</h2>
                    <p className="text-white/70 text-lg leading-relaxed">
                      Upload a photo to get your first style rating and see the magic in action
                    </p>
                  </div>

                  <div className="space-y-6">
                    <ImageUpload onImageSelect={setSelectedImage} />

                    {selectedImage && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Button
                          onClick={handleImageUpload}
                          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl"
                        >
                          <Sparkles className="mr-3 h-6 w-6" />
                          Get My Style Rating
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Rating Results Step */}
              {currentStep === 'rating' && (
                <motion.div
                  key="rating"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="flex flex-col items-center justify-center h-full space-y-8"
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
                          <Button
                            onClick={() => setCurrentStep('celebration')}
                            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl"
                          >
                            Continue
                          </Button>
                        </motion.div>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {/* Celebration Step */}
              {currentStep === 'celebration' && (
                <motion.div
                  key="celebration"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="text-center space-y-8 flex flex-col justify-center h-full"
                >
                  <div className="space-y-6">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <PartyPopper className="w-24 h-24 text-orange-400 mx-auto" />
                    </motion.div>
                    <h2 className="text-4xl font-bold text-white">Congratulations!</h2>
                    <p className="text-white/80 text-xl leading-relaxed">
                      You've just experienced the power of Drip Max!<br />
                      {isPro ? 
                        "You already have Pro access - enjoy unlimite style analyses!" :
                        "Ready to unlock your full style potential?"
                      }
                    </p>
                  </div>

                  <Button
                    onClick={() => {
                      console.log('Celebration button clicked:', { isPro, subscriptionIsActive: subscription.isActive });
                      if (isPro) {
                        console.log('Going to handleCompleteOnboarding');
                        handleCompleteOnboarding();
                      } else {
                        console.log('Going to trial-offer');
                        setCurrentStep('trial-offer');
                      }
                    }}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-xl font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl"
                  >
                    {isPro ? "Continue to App" : "Next"}
                  </Button>
                </motion.div>
              )}

              {/* Trial Offer Step */}
              {currentStep === 'trial-offer' && (
                <motion.div
                  key="trial-offer"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="text-center space-y-10 flex flex-col justify-center h-full"
                >
                  <div className="space-y-8">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ 
                        duration: 3, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Crown className="w-24 h-24 text-orange-400 mx-auto" />
                    </motion.div>
                    <h1 className="text-4xl font-bold text-white leading-tight">
                      We offer<br />
                      <span className="text-orange-400 text-5xl">7 days free</span><br />
                      so everyone can<br />
                      max their drip with<br />
                      <span className="text-orange-400">Drip Max</span>
                    </h1>
                  </div>
                  
                  <Button
                    onClick={() => setCurrentStep('paywall')}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-xl font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl"
                  >
                    Try for Free
                  </Button>
                </motion.div>
              )}

              {/* Paywall Step */}
              {currentStep === 'paywall' && (
                <motion.div
                  key="paywall"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full"
                >
                  <ProOfferCard onContinue={handleCompleteOnboarding} />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
