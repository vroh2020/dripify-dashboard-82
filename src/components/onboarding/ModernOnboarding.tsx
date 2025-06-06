
import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ImageUpload } from "@/components/ImageUpload";
import { StyleLoadingOverlay } from "@/components/StyleLoadingOverlay";
import { DripScore } from "@/components/DripScore";
import { ModernRatingsDisplay } from "@/components/ModernRatingsDisplay";
import { analyzeStyle } from "@/utils/imageAnalysis";
import { parseAnalysis } from "@/utils/analysisParser";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, PartyPopper, Crown, Apple, TrendingUp, Ruler, Palette, Star, Zap } from "lucide-react";
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { Capacitor } from '@capacitor/core';
import { InAppReview } from '@capacitor-community/in-app-review';

interface OnboardingData {
  age?: string;
  referralSource?: string;
  mainGoal?: string;
  analysisResult?: any;
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
  | 'pricing';

// Secure random generation utility
const generateSecureRandom = (length: number = 16): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // Use crypto.getRandomValues for secure random generation
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += charset[values[i] % charset.length];
    }
  } else {
    // Fallback for environments without crypto.getRandomValues
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
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showNextButton, setShowNextButton] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const { toast } = useToast();

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
    'pricing': 9
  };
  const progress = (stepMap[currentStep] / totalSteps) * 100;

  // Options data
  const ageOptions = [
    "16-20", "21-25", "26-30", "31-35", 
    "36-40", "41-45", "46-50", "50+"
  ];

  const goalOptions = [
    { id: "get-drippy", title: "Get Drippy", description: "Elevate my style game" },
    { id: "find-outfits", title: "Find Good Outfits", description: "Discover what looks good on me" },
    { id: "get-partner", title: "Trying to get a BF/GF", description: "Look attractive for dating" },
    { id: "drip-max", title: "Drip Max", description: "Become a style icon" }
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
        // Web fallback - continue to age step
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
      // Use secure random generation for temporary accounts
      const randomId = generateSecureRandom(12);
      const timestamp = Date.now();
      const tempEmail = `temp_${timestamp}_${randomId}@dripmax.internal`;
      const tempPassword = generateSecureRandom(24); // 24 character secure password
      
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
        // If temp account fails, just continue anyway
      } else {
        console.log('Secure temp account created successfully:', data);
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

      // Create a local URL for the image to avoid authentication issues
      const imageUrl = URL.createObjectURL(selectedImage);
      
      // Mock analysis result for demo purposes (properly typed)
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
        tips: [
          { category: "Accessories", tip: "Consider adding a subtle accessory like a watch", level: "beginner" },
          { category: "Color", tip: "The color combination works well together", level: "intermediate" },
          { category: "Fit", tip: "Good fit on the shirt and tie", level: "beginner" }
        ]
      };

      // Try to get REAL analysis from the API
      let finalResult = mockAnalysisResult;
      
      try {
        // Use the REAL analysis API with onboarding flag - this is what the user wants!
        const analysisResult = await analyzeStyle(selectedImage, true);
        
        console.log('Onboarding: Real AI analysis received:', analysisResult);
        
        // Use the real analysis result completely
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
          // Ensure tips conform to the expected type (beginner or intermediate only)
          tips: analysisResult.tips && analysisResult.tips.length > 0 
            ? analysisResult.tips.map(tip => ({
                ...tip,
                level: tip.level === "advanced" ? "intermediate" : tip.level
              }))
            : [
                { category: "General", tip: "Your style analysis has been completed successfully!", level: "beginner" }
              ]
        };
        
        console.log('Onboarding: Using real analysis result:', finalResult);
      } catch (analysisError) {
        console.log('Real analysis failed, using fallback mock:', analysisError);
        // Only use mock as fallback if real API fails
        toast({
          title: "Analysis Notice", 
          description: "Using demo analysis for onboarding experience",
          variant: "default"
        });
      }
      
      setAnalysisResult(finalResult);
      
      // Save to Supabase only if user is properly authenticated (not temp account)
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
              tips: JSON.stringify(finalResult.tips || []),
              image_url: null, // Don't store image URL for temp accounts
              raw_analysis: finalResult.rawAnalysis || "Style analysis completed"
            });
        } catch (dbError) {
          console.error('Database error:', dbError);
          // Continue anyway - this is just onboarding
        }
      }

      // Show results for 10 seconds to give proper viewing time, then enable next button
      setTimeout(() => {
        setShowNextButton(true);
        
        // Request in-app review after user has experienced the core value
        // This is the perfect moment - they just got their style analysis!
        try {
          InAppReview.requestReview().catch(error => {
            console.log('In-app review request failed (this is normal):', error);
            // Don't show error to user - review prompts often fail and that's expected
          });
        } catch (error) {
          console.log('In-app review not available:', error);
          // Silently handle - this might happen on web or unsupported platforms
        }
      }, 10000);
    } catch (error) {
      console.error('Analysis error:', error);
      
      // Even if analysis fails completely, show a demo result
      const demoResult = {
        overallScore: 86,
        rawAnalysis: "Demo analysis for onboarding",
        imageUrl: URL.createObjectURL(selectedImage),
        summary: "Looking great! Your style shows good attention to detail and coordination.",
        breakdown: [],
        tips: []
      };
      
      setAnalysisResult(demoResult);
      
      setTimeout(() => {
        setShowNextButton(true);
        
        // Request in-app review even in demo mode
        try {
          InAppReview.requestReview().catch(error => {
            console.log('In-app review request failed (this is normal):', error);
          });
        } catch (error) {
          console.log('In-app review not available:', error);
        }
      }, 2000);
      
      toast({
        title: "Demo Mode",
        description: "Showing sample rating for onboarding demo",
        variant: "default"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    // Prevent multiple completion attempts
    if (isCompleting) {
      console.log('Already completing onboarding, skipping...');
      return;
    }

    setIsCompleting(true);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (user && !userError) {
        console.log('User already exists, completing onboarding with existing user:', user.id);
        
        // Save user profile data if user exists and is not temp account
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
        
        // Complete onboarding immediately - user is already authenticated
        onComplete({
          ...onboardingData,
          analysisResult
        });
        return;
      }

      console.log('No authenticated user found, creating new account...');
      
      // Create a new secure account only if no user exists
      const randomId = generateSecureRandom(12);
      const timestamp = Date.now();
      const tempEmail = `user_${timestamp}_${randomId}@dripmax.internal`;
      const tempPassword = generateSecureRandom(32); // Very secure 32 character password
      
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
        
        // If account creation fails (like rate limit), still complete onboarding
        // The user can use the app in a limited way or sign up later
        toast({
          title: "Account Creation Delayed",
          description: "You can still use the app! Sign up later for full features.",
          variant: "default"
        });
      } else {
        console.log('New secure user account created successfully:', authData.user?.id);
        
        // Wait a moment for session to be established
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Complete onboarding regardless of account creation success
      onComplete({
        ...onboardingData,
        analysisResult
      });
      
    } catch (error) {
      console.error('Error in handleCompleteOnboarding:', error);
      
      // Always complete onboarding to prevent getting stuck
      onComplete({
        ...onboardingData,
        analysisResult
      });
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] via-[#2C1F3D] to-[#1A1F2C] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md mx-auto">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 to-orange-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </div>

        <Card className="backdrop-blur-xl bg-black/40 border-white/10 shadow-2xl">
          <CardContent className="p-6 sm:p-8">
            <StyleLoadingOverlay isAnalyzing={isAnalyzing} />
            
            <AnimatePresence mode="wait">
              {/* Welcome Step */}
              {currentStep === 'welcome' && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="text-center space-y-8"
                >
                  {/* Mascot/Emoji Animation */}
                  <div className="flex justify-center">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="inline-block"
                    >
                      <span className="text-5xl sm:text-6xl">🧑‍🎤</span>
                    </motion.div>
                  </div>
                  <div className="space-y-4">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                      Welcome to <span className="bg-gradient-to-r from-orange-400 to-orange-500 text-transparent bg-clip-text">Drip Max</span>
                    </h1>
                    <p className="text-white/80 text-lg leading-relaxed">
                      Your personal AI stylist is here!<br />
                      Get instant style ratings and become the best dressed version of yourself.
                    </p>
                  </div>
                  {/* App Preview */}
                  <div className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 rounded-2xl p-6 border border-white/10">
                    <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-gray-600 to-gray-800 rounded-lg flex items-center justify-center">
                          <span className="text-2xl text-white/70">⭐</span>
                        </div>
                        <div>
                          <div className="text-white font-medium">Ratings</div>
                          <div className="text-white/60 text-sm">Overall</div>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-white">86</div>
                        <div className="w-12 h-2 bg-purple-500 rounded-full mx-auto"></div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Button
                      onClick={handleAppleSignIn}
                      className="w-full bg-black hover:bg-gray-900 text-white h-12 text-base font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] flex items-center justify-center"
                    >
                      <Apple className="mr-3 h-5 w-5" />
                      Continue with Apple
                    </Button>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/20"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-black/40 text-white/60">or</span>
                      </div>
                    </div>
                    <Button
                      onClick={handleContinueWithEmail}
                      className="w-full bg-gray-800 border border-white/20 text-white hover:bg-gray-900 h-12 text-base font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] flex items-center justify-center"
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
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="text-center space-y-8"
                >
                  <div className="space-y-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">What's your age?</h2>
                    <p className="text-white/60">Help us personalize your style experience</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {ageOptions.map((age) => (
                      <Button
                        key={age}
                        onClick={() => handleAgeSelect(age)}
                        variant="outline"
                        className="border-white/30 text-white hover:bg-gradient-to-r hover:from-orange-500/30 hover:to-orange-400/30 hover:border-orange-500/70 hover:text-white h-14 text-lg font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02] bg-white/5"
                      >
                        {age}
                      </Button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Goal Step */}
              {currentStep === 'goal' && (
                <motion.div
                  key="goal"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="text-center space-y-8"
                >
                  <div className="space-y-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">What's your main goal?</h2>
                    <p className="text-white/60">Let us know what you want to achieve</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                    <Button
                      onClick={() => handleGoalSelect('get-drippy')}
                      className="flex flex-col items-center justify-center bg-gray-800 border border-white/20 text-white hover:bg-gradient-to-r hover:from-orange-500/30 hover:to-orange-400/30 hover:border-orange-500/70 hover:text-white min-h-[90px] rounded-xl transition-all duration-200 hover:scale-[1.03] p-4"
                    >
                      <span className="text-2xl mb-2">🎯</span>
                      <span className="font-bold text-lg">Get Drippy</span>
                      <span className="text-xs text-white/70 mt-1">Elevate my style game</span>
                    </Button>
                    <Button
                      onClick={() => handleGoalSelect('find-outfits')}
                      className="flex flex-col items-center justify-center bg-gray-800 border border-white/20 text-white hover:bg-gradient-to-r hover:from-orange-500/30 hover:to-orange-400/30 hover:border-orange-500/70 hover:text-white min-h-[90px] rounded-xl transition-all duration-200 hover:scale-[1.03] p-4"
                    >
                      <span className="text-2xl mb-2">🧥</span>
                      <span className="font-bold text-lg">Find Good Outfits</span>
                      <span className="text-xs text-white/70 mt-1">Discover what looks good on me</span>
                    </Button>
                    <Button
                      onClick={() => handleGoalSelect('get-partner')}
                      className="flex flex-col items-center justify-center bg-gray-800 border border-white/20 text-white hover:bg-gradient-to-r hover:from-orange-500/30 hover:to-orange-400/30 hover:border-orange-500/70 hover:text-white min-h-[90px] rounded-xl transition-all duration-200 hover:scale-[1.03] p-4"
                    >
                      <span className="text-2xl mb-2">💑</span>
                      <span className="font-bold text-lg">Trying to get a BF/GF</span>
                      <span className="text-xs text-white/70 mt-1">Look attractive for dating</span>
                    </Button>
                    <Button
                      onClick={() => handleGoalSelect('drip-max')}
                      className="flex flex-col items-center justify-center bg-gray-800 border border-white/20 text-white hover:bg-gradient-to-r hover:from-orange-500/30 hover:to-orange-400/30 hover:border-orange-500/70 hover:text-white min-h-[90px] rounded-xl transition-all duration-200 hover:scale-[1.03] p-4"
                    >
                      <span className="text-2xl mb-2">👑</span>
                      <span className="font-bold text-lg">Drip Max</span>
                      <span className="text-xs text-white/70 mt-1">Become a style icon</span>
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Test Photo Step */}
              {currentStep === 'test-photo' && (
                <motion.div
                  key="test-photo"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="text-center space-y-8"
                >
                  <div className="space-y-4">
                    <Sparkles className="w-16 h-16 text-orange-400 mx-auto" />
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">Let's test it out!</h2>
                    <p className="text-white/70 leading-relaxed">
                      Upload a photo to get your first style rating and see the magic in action
                    </p>
                  </div>

                  <div className="space-y-6">
                    <ImageUpload onImageSelect={setSelectedImage} />

                    {selectedImage && (
                      <Button
                        onClick={handleImageUpload}
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-12 text-base font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-lg"
                      >
                        Get My Style Rating ✨
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Rating Results Step */}
              {currentStep === 'rating' && (
                <motion.div
                  key="rating"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center space-y-8"
                >
                  {analysisResult && (
                    <>
                      {/* New Modern Ratings Display */}
                      <ModernRatingsDisplay
                        overallScore={analysisResult.overallScore || 86}
                        profileImage={analysisResult.imageUrl}
                        breakdown={analysisResult.breakdown || []}
                        onSave={() => console.log('Save clicked')}
                        onShare={() => console.log('Share clicked')}
                      />
                      
                      {showNextButton ? (
                        <div className="w-full max-w-xs mx-auto mt-8">
                          <Button
                            onClick={() => setCurrentStep('celebration')}
                            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-12 text-base font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-lg"
                          >
                            Next
                          </Button>
                        </div>
                      ) : null}
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
                  transition={{ duration: 0.5 }}
                  className="text-center space-y-8"
                >
                  <div className="space-y-6">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <PartyPopper className="w-20 h-20 text-orange-400 mx-auto" />
                    </motion.div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-white">Congratulations!</h2>
                    <p className="text-white/70 text-lg leading-relaxed">
                      You've just experienced the power of Drip Max!<br />
                      Ready to unlock your full style potential?
                    </p>
                  </div>

                  <Button
                    onClick={() => setCurrentStep('trial-offer')}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-12 text-base font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-lg"
                  >
                    Next
                  </Button>
                </motion.div>
              )}

              {/* Trial Offer Step */}
              {currentStep === 'trial-offer' && (
                <motion.div
                  key="trial-offer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="text-center space-y-12"
                >
                  <div className="space-y-8">
                    <Crown className="w-20 h-20 text-orange-400 mx-auto" />
                    <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
                      We offer<br />
                      <span className="text-orange-400">7 days free</span><br />
                      so everyone can<br />
                      max their drip with<br />
                      <span className="text-orange-400">Drip Max</span>
                    </h1>
                  </div>

                  <Button
                    onClick={() => setCurrentStep('trial-reminder')}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-14 text-lg font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-lg"
                  >
                    Try for Free
                  </Button>
                </motion.div>
              )}

              {/* Trial Reminder Step */}
              {currentStep === 'trial-reminder' && (
                <motion.div
                  key="trial-reminder"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="text-center space-y-12"
                >
                  <div className="space-y-8">
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center"
                    >
                      <span className="text-3xl">⏰</span>
                    </motion.div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-white leading-relaxed">
                      You will get a reminder before your trial expires in 2 days.
                    </h2>
                  </div>

                  <Button
                    onClick={() => setCurrentStep('pricing')}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-14 text-lg font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-lg"
                  >
                    Try for Free
                  </Button>
                </motion.div>
              )}

              {/* Pricing Step */}
              {currentStep === 'pricing' && (
                <motion.div
                  key="pricing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="text-center space-y-8"
                >
                  <div className="space-y-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">Choose Your Plan</h2>
                    <p className="text-white/60">Start your 7-day free trial today</p>
                  </div>

                  <div className="space-y-4">
                    {/* Weekly Plan */}
                    <div className="bg-gradient-to-r from-orange-500/20 to-purple-500/20 rounded-xl p-6 border border-orange-500/50 transition-all duration-200 hover:scale-[1.02]">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-white font-semibold text-lg">Weekly</span>
                        <span className="bg-orange-400 text-black text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
                      </div>
                      <div className="text-3xl font-bold text-white">
                        $4.99<span className="text-base text-white/60 font-normal">/week</span>
                      </div>
                    </div>

                    {/* Monthly Plan */}
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10 transition-all duration-200 hover:scale-[1.02]">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-white font-semibold text-lg">Monthly</span>
                        <span className="bg-green-400 text-black text-xs font-bold px-3 py-1 rounded-full">Best Value</span>
                      </div>
                      <div className="text-3xl font-bold text-white">
                        $12.99<span className="text-base text-white/60 font-normal">/month</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Button
                      onClick={handleCompleteOnboarding}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-12 text-base font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-lg"
                    >
                      Start Free Trial
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface ResultBarProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

const ResultBar = ({ icon, label, value, color }: ResultBarProps) => (
  <div className="flex items-center gap-3">
    <div>{icon}</div>
    <div className="flex-1">
      <div className="flex justify-between text-xs text-white/70 mb-1">
        <span>{label}</span>
        <span className="font-bold text-white">{value}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }}></div>
      </div>
    </div>
  </div>
);
