
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
import { Sparkles, PartyPopper, Crown, Apple, TrendingUp, Ruler, Palette, Star, Zap, Camera, Users, Award, CheckCircle2, ArrowRight, Flame, Diamond, Target, Heart, ShoppingBag, Wand2 } from "lucide-react";
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
  const totalSteps = 8;
  const stepMap = {
    'welcome': 1,
    'age': 2,
    'goal': 3,
    'test-photo': 4,
    'rating': 5,
    'celebration': 6,
    'trial-offer': 7,
    'paywall': 8
  };
  const progress = (stepMap[currentStep] / totalSteps) * 100;

  // Premium age options with emojis
  const ageOptions = [
    { value: "16-20", emoji: "🌟", label: "Gen Z" },
    { value: "21-25", emoji: "💫", label: "Young Pro" },
    { value: "26-30", emoji: "✨", label: "Prime Time" },
    { value: "31-35", emoji: "🔥", label: "Established" },
    { value: "36-40", emoji: "💎", label: "Refined" },
    { value: "41-45", emoji: "👑", label: "Distinguished" },
    { value: "46-50", emoji: "🌠", label: "Sophisticated" },
    { value: "50+", emoji: "⭐", label: "Timeless" }
  ];

  // Premium goal options
  const goalOptions = [
    { 
      id: "get-drippy", 
      title: "Become Irresistible", 
      subtitle: "Elevate your entire vibe",
      description: "Transform into the best-dressed version of yourself", 
      emoji: "🔥",
      gradient: "from-orange-500 to-red-500",
      icon: Flame
    },
    { 
      id: "find-outfits", 
      title: "Perfect Every Look", 
      subtitle: "Never have a bad outfit day",
      description: "Discover what makes you look absolutely stunning", 
      emoji: "✨",
      gradient: "from-purple-500 to-pink-500",
      icon: Sparkles
    },
    { 
      id: "get-partner", 
      title: "Date Like a Champion", 
      subtitle: "Be the catch everyone wants",
      description: "Look so good that dating becomes effortless", 
      emoji: "💕",
      gradient: "from-pink-500 to-rose-500",
      icon: Heart
    },
    { 
      id: "drip-max", 
      title: "Style Icon Status", 
      subtitle: "Become legendary",
      description: "Join the ranks of the best-dressed people alive", 
      emoji: "👑",
      gradient: "from-yellow-500 to-orange-500",
      icon: Crown
    }
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
      }, 8000);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-orange-500/10"></div>
      <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-white/5 to-transparent rounded-full blur-2xl"></div>

      {/* Fixed Container */}
      <div className="w-full max-w-sm mx-auto relative z-10">
        {/* Premium Progress Bar */}
        <div className="mb-8">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-400 via-purple-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          </div>
          <div className="text-center mt-4">
            <span className="text-white/80 text-sm font-medium tracking-wide">
              {stepMap[currentStep]} of {totalSteps}
            </span>
          </div>
        </div>

        {/* Main Card - Premium Glass Effect */}
        <Card className="backdrop-blur-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/20 shadow-2xl h-[650px] flex flex-col rounded-3xl overflow-hidden">
          <CardContent className="p-8 flex-1 flex flex-col justify-center relative">
            <StyleLoadingOverlay isAnalyzing={isAnalyzing} />
            
            <AnimatePresence mode="wait">
              {/* Welcome Step - Ultra Premium */}
              {currentStep === 'welcome' && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="text-center space-y-8 flex flex-col justify-center h-full"
                >
                  <div className="space-y-8">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.05, 1],
                        rotate: [0, 2, -2, 0]
                      }}
                      transition={{ 
                        duration: 4, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="relative"
                    >
                      <div className="text-8xl mb-6 relative">
                        <span className="absolute inset-0 text-8xl blur-xl bg-gradient-to-r from-orange-400 to-purple-500 bg-clip-text text-transparent">👑</span>
                        👑
                      </div>
                    </motion.div>
                    
                    <div className="space-y-6">
                      <h1 className="text-5xl font-black text-transparent bg-gradient-to-r from-white via-orange-200 to-purple-200 bg-clip-text leading-tight tracking-tight">
                        Drip Max
                      </h1>
                      <div className="space-y-3">
                        <p className="text-2xl font-bold text-white/90 leading-tight">
                          Your AI Style Oracle
                        </p>
                        <p className="text-lg text-white/70 leading-relaxed px-4">
                          Transform into the most magnetic version of yourself with AI that never lies
                        </p>
                      </div>
                    </div>

                    {/* Premium Features Preview */}
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.4, duration: 0.6 }}
                      className="space-y-4"
                    >
                      <div className="bg-gradient-to-r from-orange-500/15 via-purple-500/15 to-pink-500/15 rounded-2xl p-6 border border-white/10 backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-purple-500 rounded-xl flex items-center justify-center">
                              <Diamond className="text-white text-xl" />
                            </div>
                            <div className="text-left">
                              <div className="text-white font-bold text-lg">Premium Analysis</div>
                              <div className="text-white/60 text-sm">AI-Powered Perfection</div>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-black text-white">96</div>
                            <div className="w-12 h-2 bg-gradient-to-r from-orange-400 to-purple-500 rounded-full"></div>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-white/60">
                          <span>Style Genius</span>
                          <span>Absolutely Magnetic</span>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  <div className="space-y-5">
                    <Button
                      onClick={handleAppleSignIn}
                      className="w-full bg-black/80 hover:bg-black/90 text-white h-16 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-[1.02] flex items-center justify-center shadow-2xl border border-white/10"
                    >
                      <Apple className="mr-3 h-6 w-6" />
                      Continue with Apple
                    </Button>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/20"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-6 bg-gradient-to-r from-slate-950/80 to-purple-950/80 text-white/60 font-medium backdrop-blur-sm rounded-full">or</span>
                      </div>
                    </div>
                    
                    <Button
                      onClick={handleContinueWithEmail}
                      className="w-full bg-gradient-to-r from-white/10 to-white/5 border-2 border-white/30 text-white hover:bg-gradient-to-r hover:from-white/20 hover:to-white/10 hover:border-white/40 h-16 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-[1.02] backdrop-blur-xl"
                    >
                      Continue with Email
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Age Step - Luxury Grid */}
              {currentStep === 'age' && (
                <motion.div
                  key="age"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="text-center space-y-8 flex flex-col justify-center h-full"
                >
                  <div className="space-y-6">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="text-6xl mb-4"
                    >
                      ✨
                    </motion.div>
                    <div className="space-y-3">
                      <h2 className="text-4xl font-black text-transparent bg-gradient-to-r from-white to-purple-200 bg-clip-text">
                        Your Generation?
                      </h2>
                      <p className="text-white/70 text-lg">We'll tailor your style journey perfectly</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {ageOptions.map((age, index) => (
                      <motion.div
                        key={age.value}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1, duration: 0.4 }}
                      >
                        <Button
                          onClick={() => handleAgeSelect(age.value)}
                          className="w-full h-20 bg-gradient-to-br from-white/10 to-white/5 border-2 border-white/20 text-white hover:bg-gradient-to-br hover:from-orange-500/20 hover:to-purple-500/20 hover:border-orange-400/50 hover:scale-105 transition-all duration-300 rounded-2xl backdrop-blur-xl flex flex-col items-center justify-center space-y-1 group"
                        >
                          <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{age.emoji}</span>
                          <span className="font-bold text-lg">{age.value}</span>
                          <span className="text-xs text-white/60 font-medium">{age.label}</span>
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Goal Step - Premium Cards */}
              {currentStep === 'goal' && (
                <motion.div
                  key="goal"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="text-center space-y-8 flex flex-col justify-center h-full"
                >
                  <div className="space-y-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="text-6xl mb-4"
                    >
                      🎯
                    </motion.div>
                    <div className="space-y-3">
                      <h2 className="text-4xl font-black text-transparent bg-gradient-to-r from-white to-orange-200 bg-clip-text">
                        Your Mission?
                      </h2>
                      <p className="text-white/70 text-lg">Choose your style transformation</p>
                    </div>
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
                          className={`w-full h-24 bg-gradient-to-br from-white/10 to-white/5 border-2 border-white/20 text-white hover:bg-gradient-to-br hover:${goal.gradient}/20 hover:border-orange-400/50 hover:scale-105 transition-all duration-300 rounded-2xl backdrop-blur-xl flex items-center justify-start p-6 group`}
                        >
                          <div className="flex items-center space-x-4 w-full">
                            <div className={`w-16 h-16 bg-gradient-to-br ${goal.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                              <goal.icon className="text-white text-2xl" />
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-black text-xl text-white">{goal.title}</div>
                              <div className="font-semibold text-sm text-orange-300/80">{goal.subtitle}</div>
                              <div className="text-white/60 text-xs mt-1">{goal.description}</div>
                            </div>
                          </div>
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Test Photo Step - Ultra Modern */}
              {currentStep === 'test-photo' && (
                <motion.div
                  key="test-photo"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="text-center space-y-8 flex flex-col justify-center h-full"
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
                      className="relative"
                    >
                      <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-purple-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                        <Camera className="w-12 h-12 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    </motion.div>
                    
                    <div className="space-y-4">
                      <h2 className="text-4xl font-black text-transparent bg-gradient-to-r from-white via-orange-200 to-purple-200 bg-clip-text leading-tight">
                        Ready for Magic?
                      </h2>
                      <p className="text-xl text-white/80 leading-relaxed px-2">
                        Upload a photo and watch our AI reveal your style secrets
                      </p>
                      <div className="flex justify-center space-x-6 pt-2">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                          <span className="text-sm text-white/60">Instant Analysis</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                          <span className="text-sm text-white/60">100% Private</span>
                        </div>
                      </div>
                    </div>
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
                          className="w-full bg-gradient-to-r from-orange-500 via-purple-500 to-pink-500 hover:from-orange-600 hover:via-purple-600 hover:to-pink-600 h-16 text-xl font-black rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl flex items-center justify-center space-x-3"
                        >
                          <Wand2 className="h-6 w-6" />
                          <span>Analyze My Style</span>
                          <ArrowRight className="h-6 w-6" />
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
                            className="w-full bg-gradient-to-r from-orange-500 via-purple-500 to-pink-500 hover:from-orange-600 hover:via-purple-600 hover:to-pink-600 h-16 text-xl font-black rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl"
                          >
                            <span>Continue</span>
                            <ArrowRight className="ml-2 h-6 w-6" />
                          </Button>
                        </motion.div>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {/* Celebration Step - Epic */}
              {currentStep === 'celebration' && (
                <motion.div
                  key="celebration"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="text-center space-y-8 flex flex-col justify-center h-full"
                >
                  <div className="space-y-8">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.3, 1],
                        rotateZ: [0, 10, -10, 0]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="relative"
                    >
                      <div className="text-8xl">🎉</div>
                      <div className="absolute -top-4 -left-4 text-4xl animate-bounce">✨</div>
                      <div className="absolute -top-4 -right-4 text-4xl animate-bounce" style={{ animationDelay: '0.5s' }}>🌟</div>
                      <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-4xl animate-bounce" style={{ animationDelay: '1s' }}>💫</div>
                    </motion.div>
                    
                    <div className="space-y-6">
                      <h2 className="text-5xl font-black text-transparent bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300 bg-clip-text leading-tight">
                        You're Incredible!
                      </h2>
                      <div className="space-y-4">
                        <p className="text-2xl font-bold text-white/90">
                          🔥 You just experienced the future of style
                        </p>
                        <p className="text-lg text-white/70 leading-relaxed px-4">
                          {isPro ? 
                            "You already have Pro access - unlock unlimited analyses and become a style legend!" :
                            "Ready to unlock your full transformation and become absolutely irresistible?"
                          }
                        </p>
                      </div>
                    </div>
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
                    className="w-full bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 hover:from-yellow-500 hover:via-orange-600 hover:to-pink-600 h-16 text-xl font-black rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl flex items-center justify-center space-x-3"
                  >
                    <span>{isPro ? "Enter Your Kingdom" : "Unlock Full Power"}</span>
                    <ArrowRight className="h-6 w-6" />
                  </Button>
                </motion.div>
              )}

              {/* Trial Offer Step - Luxury */}
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
                        duration: 4, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="relative"
                    >
                      <div className="w-28 h-28 bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                        <Crown className="w-16 h-16 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center animate-pulse">
                        <span className="text-white font-black text-sm">7</span>
                      </div>
                    </motion.div>
                    
                    <div className="space-y-6">
                      <h1 className="text-4xl font-black text-transparent bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300 bg-clip-text leading-tight">
                        Transform for FREE
                      </h1>
                      <div className="space-y-4">
                        <div className="text-6xl font-black text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text">
                          7 DAYS FREE
                        </div>
                        <p className="text-xl text-white/80 leading-relaxed px-2">
                          Become the most magnetic version of yourself with unlimited AI style analysis
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => setCurrentStep('paywall')}
                    className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 h-16 text-xl font-black rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl flex items-center justify-center space-x-3"
                  >
                    <Crown className="h-6 w-6" />
                    <span>Start Free Trial</span>
                    <ArrowRight className="h-6 w-6" />
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
