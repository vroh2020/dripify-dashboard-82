import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ImageUpload } from "@/components/ImageUpload";
import { StyleLoadingOverlay } from "@/components/StyleLoadingOverlay";
import { DripScore } from "@/components/DripScore";
import { analyzeStyle } from "@/utils/imageAnalysis";
import { parseAnalysis } from "@/utils/analysisParser";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, PartyPopper, Crown, Clock, Shield } from "lucide-react";
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { Capacitor } from '@capacitor/core';

interface OnboardingData {
  age?: string;
  referralSource?: string;
  mainGoal?: string;
  analysisResult?: any;
}

interface PaywallOnboardingProps {
  onComplete: (userData: OnboardingData) => void;
}

type OnboardingStep = 
  | 'app-preview' 
  | 'age' 
  | 'referral' 
  | 'goal' 
  | 'got-you' 
  | 'test-app' 
  | 'rating' 
  | 'celebration' 
  | 'free-trial' 
  | 'trial-reminder' 
  | 'paywall';

export const PaywallOnboarding = ({ onComplete }: PaywallOnboardingProps) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('app-preview');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const { toast } = useToast();

  const ageOptions = [
    "16-20", "21-25", "26-30", "31-35", "36-40", "41-45", "46-50", "50+"
  ];

  const referralOptions = [
    "Instagram", "TikTok", "Twitter", "Friend", "Google", "Other"
  ];

  const goalOptions = [
    { id: "get-drippy", title: "Get Drippy", description: "Elevate my style game" },
    { id: "find-outfits", title: "Find Good Outfits", description: "Discover what looks good on me" },
    { id: "get-partner", title: "Trying to get a BF/GF", description: "Look attractive for dating" },
    { id: "drip-max", title: "Drip Max", description: "Become a style icon" }
  ];

  const handleAppleSignIn = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const options = {
          clientId: 'com.dripmax.app',
          redirectURI: 'https://jjqwhxamjxsiotnhhqco.supabase.co/auth/v1/callback',
          scopes: 'email name',
          state: Math.random().toString(36).substring(7),
          nonce: Math.random().toString(36).substring(7),
        };

        const result = await SignInWithApple.authorize(options);
        
        if (result.response.identityToken) {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: result.response.identityToken,
          });
          
          if (error) throw error;
          
          toast({
            title: "Welcome!",
            description: "Successfully signed in with Apple",
          });
          
          setCurrentStep('age');
        }
      } else {
        // Web fallback - continue without auth for now
        toast({
          title: "Continue",
          description: "Let's get started with your style journey!",
        });
        setCurrentStep('age');
      }
    } catch (error) {
      console.error('Apple Sign In error:', error);
      // Continue anyway for demo purposes
      setCurrentStep('age');
    }
  };

  const handleContinueWithEmail = async () => {
    try {
      // Create a temporary user account for the onboarding process
      const tempEmail = `temp_${Date.now()}@example.com`;
      const tempPassword = Math.random().toString(36).substring(2, 15);
      
      const { data, error } = await supabase.auth.signUp({
        email: tempEmail,
        password: tempPassword,
        options: {
          data: {
            username: `temp_user_${Date.now()}`,
            is_temp_account: true
          }
        }
      });

      if (error) {
        console.error('Temp account creation error:', error);
        // Continue anyway
      } else {
        console.log('Temporary account created for onboarding');
      }
      
      setCurrentStep('age');
    } catch (error) {
      console.error('Error creating temp account:', error);
      setCurrentStep('age');
    }
  };

  const handleAgeSelect = (age: string) => {
    setOnboardingData(prev => ({ ...prev, age }));
    setCurrentStep('referral');
  };

  const handleReferralSelect = (source: string) => {
    setOnboardingData(prev => ({ ...prev, referralSource: source }));
    setCurrentStep('goal');
  };

  const handleGoalSelect = (goal: string) => {
    setOnboardingData(prev => ({ ...prev, mainGoal: goal }));
    setCurrentStep('got-you');
  };

  const handleImageUpload = async () => {
    if (!selectedImage) return;

    try {
      setIsAnalyzing(true);
      setCurrentStep('rating');

      const analysisResult = await analyzeStyle(selectedImage);
      const parsedResult = parseAnalysis(analysisResult.rawAnalysis);
      
      setAnalysisResult({
        ...analysisResult,
        ...parsedResult
      });
      
      // Save the analysis to Supabase only if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const { error } = await supabase
            .from('style_analyses')
            .insert({
              user_id: user.id,
              total_score: parsedResult.overallScore || analysisResult.overallScore,
              breakdown: JSON.stringify(parsedResult.breakdown || []),
              feedback: parsedResult.summary || analysisResult.rawAnalysis.substring(0, 200),
              tips: JSON.stringify(parsedResult.tips || []),
              image_url: analysisResult.imageUrl,
              raw_analysis: analysisResult.rawAnalysis
            });

          if (error) {
            console.error('Error saving analysis:', error);
          }
        } catch (dbError) {
          console.error('Database error:', dbError);
        }
      }

      setTimeout(() => {
        setCurrentStep('celebration');
      }, 2000);
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: "Please try again with a different image",
        variant: "destructive"
      });
      setCurrentStep('test-app');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            username: user.email?.split('@')[0] || 'User',
            referral_source: onboardingData.referralSource,
          });

        if (error) {
          console.error('Error saving profile:', error);
        }
      }
    } catch (error) {
      console.error('Error in saveUserProfile:', error);
    }
  };

  const handleCompleteOnboarding = async () => {
    await saveUserProfile();
    onComplete({
      ...onboardingData,
      analysisResult
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] to-[#2C1F3D] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="backdrop-blur-xl bg-black/30 border-white/10">
          <CardContent className="p-6">
            <StyleLoadingOverlay isAnalyzing={isAnalyzing} />
            
            <AnimatePresence mode="wait">
              {currentStep === 'app-preview' && (
                <motion.div
                  key="app-preview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center space-y-6"
                >
                  <div className="space-y-4">
                    <h1 className="text-2xl font-bold text-white">
                      Welcome to <span className="text-orange-400">Drip Max</span>
                    </h1>
                    <p className="text-white/70">
                      Get instant style ratings and become the best dressed version of yourself
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-orange-500/20 to-purple-500/20 rounded-lg p-4 border border-white/10">
                    <img 
                      src="/lovable-uploads/137c02b0-edb2-489d-a400-f827af28d139.png" 
                      alt="Drip Max Preview" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={handleAppleSignIn}
                      className="w-full bg-black text-white hover:bg-gray-800 py-3"
                    >
                      Continue with Apple
                    </Button>
                    
                    <Button
                      onClick={handleContinueWithEmail}
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/10 py-3"
                    >
                      Continue with Email
                    </Button>
                  </div>
                </motion.div>
              )}

              {currentStep === 'age' && (
                <motion.div
                  key="age"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-white">What's your age?</h2>
                    <p className="text-white/60 text-sm">Help us personalize your style experience</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {ageOptions.map((age) => (
                      <Button
                        key={age}
                        onClick={() => handleAgeSelect(age)}
                        variant="outline"
                        className="border-white/20 text-white hover:bg-orange-500/20 hover:border-orange-500/50 py-3"
                      >
                        {age}
                      </Button>
                    ))}
                  </div>
                </motion.div>
              )}

              {currentStep === 'referral' && (
                <motion.div
                  key="referral"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-white">Where did you find us?</h2>
                    <p className="text-white/60 text-sm">We'd love to know how you discovered Drip Max</p>
                  </div>

                  <div className="space-y-3">
                    {referralOptions.map((source) => (
                      <Button
                        key={source}
                        onClick={() => handleReferralSelect(source)}
                        variant="outline"
                        className="w-full border-white/20 text-white hover:bg-orange-500/20 hover:border-orange-500/50 py-3"
                      >
                        {source}
                      </Button>
                    ))}
                  </div>
                </motion.div>
              )}

              {currentStep === 'goal' && (
                <motion.div
                  key="goal"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-white">What's your main goal?</h2>
                    <p className="text-white/60 text-sm">Let us know what you want to achieve</p>
                  </div>

                  <div className="space-y-3">
                    {goalOptions.map((goal) => (
                      <Button
                        key={goal.id}
                        onClick={() => handleGoalSelect(goal.id)}
                        variant="outline"
                        className="w-full border-white/20 text-white hover:bg-orange-500/20 hover:border-orange-500/50 py-4 text-left"
                      >
                        <div>
                          <div className="font-medium">{goal.title}</div>
                          <div className="text-sm text-white/60">{goal.description}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </motion.div>
              )}

              {currentStep === 'got-you' && (
                <motion.div
                  key="got-you"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center space-y-6"
                >
                  <div className="space-y-4">
                    <Sparkles className="w-16 h-16 text-orange-400 mx-auto" />
                    <h2 className="text-xl font-semibold text-white">We got you!</h2>
                    <p className="text-white/70">
                      The first step is to upload a photo of yourself and see your outfit rating
                    </p>
                  </div>

                  <Button
                    onClick={() => setCurrentStep('test-app')}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 py-3"
                  >
                    Let's Test It Out!
                  </Button>
                </motion.div>
              )}

              {currentStep === 'test-app' && (
                <motion.div
                  key="test-app"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-white">Take a Picture</h2>
                    <p className="text-white/60 text-sm">Upload a photo to get your style rating</p>
                  </div>

                  <ImageUpload onImageSelect={setSelectedImage} />

                  {selectedImage && (
                    <Button
                      onClick={handleImageUpload}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 py-3"
                    >
                      Get My Rating
                    </Button>
                  )}
                </motion.div>
              )}

              {currentStep === 'rating' && (
                <motion.div
                  key="rating"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center space-y-6"
                >
                  {analysisResult && (
                    <>
                      <h2 className="text-xl font-semibold text-white">Your Style Rating</h2>
                      
                      <DripScore 
                        score={analysisResult.overallScore} 
                        feedback={analysisResult.summary || analysisResult.rawAnalysis || "Looking good! Keep exploring your style."}
                      />
                      
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <p className="text-white/70 text-sm">
                          {analysisResult.summary || "Great style! Keep it up!"}
                        </p>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {currentStep === 'celebration' && (
                <motion.div
                  key="celebration"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="text-center space-y-6"
                >
                  <div className="space-y-4">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <PartyPopper className="w-20 h-20 text-orange-400 mx-auto" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-white">Congratulations!</h2>
                    <p className="text-white/70">
                      You've just experienced the power of Drip Max! Ready to unlock your full style potential?
                    </p>
                  </div>

                  <Button
                    onClick={() => setCurrentStep('free-trial')}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 py-3"
                  >
                    Next
                  </Button>
                </motion.div>
              )}

              {currentStep === 'free-trial' && (
                <motion.div
                  key="free-trial"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center space-y-6"
                >
                  <div className="space-y-4">
                    <Crown className="w-16 h-16 text-orange-400 mx-auto" />
                    <h2 className="text-xl font-semibold text-white">7 Days Free Trial</h2>
                    <p className="text-white/70">
                      We offer 7 days free for anyone who wants to Drip Max! Experience unlimited style ratings and personalized recommendations.
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-orange-500/20 to-purple-500/20 rounded-lg p-4 border border-white/10">
                    <ul className="text-sm text-white/80 space-y-2">
                      <li>• Unlimited outfit ratings</li>
                      <li>• Personalized style tips</li>
                      <li>• Advanced analytics</li>
                      <li>• Style trend alerts</li>
                    </ul>
                  </div>

                  <Button
                    onClick={() => setCurrentStep('trial-reminder')}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 py-3"
                  >
                    Continue
                  </Button>
                </motion.div>
              )}

              {currentStep === 'trial-reminder' && (
                <motion.div
                  key="trial-reminder"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center space-y-6"
                >
                  <div className="space-y-4">
                    <Clock className="w-16 h-16 text-orange-400 mx-auto" />
                    <h2 className="text-xl font-semibold text-white">Trial Reminder</h2>
                    <p className="text-white/70">
                      You will get a reminder before your trial expires in 2 days. Cancel anytime with no commitment.
                    </p>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-center gap-2 text-green-400">
                      <Shield className="w-5 h-5" />
                      <span className="text-sm">No commitment • Cancel anytime</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => setCurrentStep('paywall')}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 py-3"
                  >
                    Continue to Pricing
                  </Button>
                </motion.div>
              )}

              {currentStep === 'paywall' && (
                <motion.div
                  key="paywall"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-white">Choose Your Plan</h2>
                    <p className="text-white/60 text-sm">Start your 7-day free trial today</p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-orange-500/20 to-purple-500/20 rounded-lg p-4 border border-orange-500/50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-medium">Weekly</span>
                        <span className="text-orange-400 text-sm">Most Popular</span>
                      </div>
                      <div className="text-2xl font-bold text-white">$4.99<span className="text-sm text-white/60">/week</span></div>
                    </div>

                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-medium">Monthly</span>
                        <span className="text-green-400 text-sm">Best Value</span>
                      </div>
                      <div className="text-2xl font-bold text-white">$12.99<span className="text-sm text-white/60">/month</span></div>
                    </div>
                  </div>

                  <Button
                    onClick={handleCompleteOnboarding}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 py-3"
                  >
                    Start Free Trial
                  </Button>

                  <p className="text-xs text-white/50">
                    By continuing, you agree to our Terms of Service and Privacy Policy. Cancel anytime.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
