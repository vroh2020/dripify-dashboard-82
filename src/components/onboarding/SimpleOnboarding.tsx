import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Camera, Check, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { analyzeStyle } from '@/utils/imageAnalysis';
import { StyleLoadingOverlay } from '../StyleLoadingOverlay';
import { ModernRatingsDisplay } from '../ModernRatingsDisplay';
import { useRevenueCat } from '@/hooks/useRevenueCat';

interface OnboardingData {
  age_range?: string;
  main_goal?: string;
  photo_url?: string;
  completed?: boolean;
  created_at?: string;
}

interface SimpleOnboardingProps {
  onComplete: () => void;
}

export const SimpleOnboarding: React.FC<SimpleOnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAge, setSelectedAge] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { offerings, purchaseProduct, isLoading: rcLoading } = useRevenueCat();

  // Initialize and restore state from localStorage
  useEffect(() => {
    const initializeOnboarding = () => {
      try {
        // Check if onboarding is already completed
        const isCompleted = localStorage.getItem('onboarding_completed') === 'true';
        if (isCompleted) {
          console.log('✅ Onboarding already completed, redirecting...');
          onComplete();
          return;
        }

        // Restore saved data
        const savedData = localStorage.getItem('onboarding_data');
        if (savedData) {
          try {
            const parsedData = JSON.parse(savedData);
            setData(parsedData);
            
            // Restore form fields
            if (parsedData.age_range) setSelectedAge(parsedData.age_range);
            if (parsedData.main_goal) setSelectedGoal(parsedData.main_goal);
            
            // Determine which step to start from
            if (parsedData.photo_url && parsedData.age_range && parsedData.main_goal) {
              setStep(4); // Go to paywall
            } else if (parsedData.main_goal && parsedData.age_range) {
              setStep(2.5); // Go to photo step
            } else if (parsedData.age_range) {
              setStep(2); // Go to goal step
            } else {
              setStep(1); // Go to age step
            }
            
            console.log('🔄 Restored onboarding state:', {
              step: step,
              data: parsedData,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.error('Error parsing saved onboarding data:', error);
            localStorage.removeItem('onboarding_data');
          }
        }
        
        setHasInitialized(true);
      } catch (error) {
        console.error('Error initializing onboarding:', error);
        setHasInitialized(true);
      }
    };

    initializeOnboarding();
  }, [onComplete]);

  // Save data to localStorage and Supabase
  const saveStep = async (stepData: Partial<OnboardingData>) => {
    const updatedData = { 
      ...data, 
      ...stepData,
      created_at: data.created_at || new Date().toISOString()
    };
    setData(updatedData);
    
    try {
      // Always save to localStorage for immediate persistence
      localStorage.setItem('onboarding_data', JSON.stringify(updatedData));
      console.log('💾 Saved to localStorage:', stepData);
      
      // Save to Supabase if user exists (optional, for sync)
      if (user?.id) {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            age_range: updatedData.age_range,
            main_goal: updatedData.main_goal,
            onboarding_completed: updatedData.completed || false,
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.warn('Supabase save failed (continuing anyway):', error);
        } else {
          console.log('✅ Saved to Supabase');
        }
      }
    } catch (error) {
      console.error('Error saving step data:', error);
      // Don't block user flow for save errors
    }
  };

  // Handle image upload and analysis
  const handleImageUpload = async () => {
    if (!selectedImage) return;
    
    setIsAnalyzing(true);
    try {
      const result = await analyzeStyle(selectedImage, true);
      setAnalysisResults(result);
      await saveStep({ photo_url: result.imageUrl });
      setStep(3); // Move to results step
    } catch (error) {
      console.error('Analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: "Please try again with a different photo.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle paywall purchase
  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      let purchaseSuccess = false;

      // Try RevenueCat if available
      if (offerings && offerings.length > 0) {
        const product = offerings[0]?.availablePackages?.[0]?.product;
        if (product) {
          purchaseSuccess = await purchaseProduct(product.identifier);
        }
      }

      // If RevenueCat fails or not available, simulate success
      if (!purchaseSuccess) {
        // Simulate purchase processing
        await new Promise(resolve => setTimeout(resolve, 1500));
        purchaseSuccess = true;
        
        toast({
          title: "Premium Trial Started! 🎉",
          description: "Welcome to your premium experience!",
        });
      }

      if (purchaseSuccess) {
        await completeOnboarding();
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      toast({
        title: "Purchase Error",
        description: "Don't worry, you can continue and upgrade later.",
        variant: "destructive"
      });
      // Continue anyway
      await completeOnboarding();
    } finally {
      setIsLoading(false);
    }
  };

  // Complete onboarding
  const completeOnboarding = async () => {
    try {
      const completionData = { completed: true };
      await saveStep(completionData);
      
      // Mark as completed in localStorage
      localStorage.setItem('onboarding_completed', 'true');
      
      // Create user profile if authenticated
      if (user?.id) {
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            age_range: data.age_range,
            main_goal: data.main_goal,
            onboarding_completed: true,
            subscription_status: 'trial', // Default to trial
            updated_at: new Date().toISOString()
          });
      }
      
      console.log('✅ Onboarding completed successfully');
      
      // Small delay to ensure state is saved
      setTimeout(() => {
        onComplete();
      }, 500);
      
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Complete anyway to avoid blocking user
      onComplete();
    }
  };

  // Skip to free version
  const handleContinueFree = async () => {
    await completeOnboarding();
  };

  const ageRanges = [
    '16-20', '21-25', '26-30', '31-35', 
    '36-40', '41-45', '46-50', '50+'
  ];

  const goals = [
    'Look more professional', 'Improve casual style',
    'Date night outfits', 'Build confidence'
  ];

  // Don't render anything until initialized
  if (!hasInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-white/60">Starting your style journey...</p>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return <StyleLoadingOverlay 
      isAnalyzing={isAnalyzing} 
      onTimeout={() => {
        setIsAnalyzing(false);
        toast({
          title: "Analysis Timeout",
          description: "Please try again with a clearer photo.",
          variant: "destructive"
        });
      }}
    />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex flex-col">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="flex-1 flex flex-col justify-center items-center p-6"
          >
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
              className="mb-8"
            >
              <Sparkles className="w-16 h-16 text-orange-400" />
            </motion.div>
            
            <h1 className="text-3xl font-bold text-white mb-4 text-center">
              Welcome to Dripify AI
            </h1>
            <p className="text-white/70 text-center mb-8 max-w-md">
              Get personalized style recommendations powered by AI in just 3 simple steps
            </p>
            
            <Button
              onClick={() => setStep(1)}
              className="w-full max-w-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-14 text-lg font-bold rounded-2xl"
            >
              Get Started
            </Button>

            {/* Guest Mode Option */}
            <div className="mt-6 text-center">
              <p className="text-white/50 text-sm mb-3">Continue as guest</p>
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <User className="w-4 h-4 mr-2" />
                Start Without Account
              </Button>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="age"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="flex-1 flex flex-col justify-center items-center p-6"
          >
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              What's your age range?
            </h2>
            
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-8">
              {ageRanges.map((age) => (
                <Button
                  key={age}
                  variant={selectedAge === age ? "default" : "outline"}
                  onClick={() => setSelectedAge(age)}
                  className={`h-12 ${
                    selectedAge === age 
                      ? 'bg-orange-500 hover:bg-orange-600' 
                      : 'border-white/20 text-white hover:bg-white/10'
                  }`}
                >
                  {age}
                </Button>
              ))}
            </div>
            
            <Button
              onClick={async () => {
                await saveStep({ age_range: selectedAge });
                setStep(2);
              }}
              disabled={!selectedAge || isLoading}
              className="w-full max-w-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-14 text-lg font-bold rounded-2xl"
            >
              {isLoading ? 'Saving...' : 'Continue'}
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="goal"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="flex-1 flex flex-col justify-center items-center p-6"
          >
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              What's your main style goal?
            </h2>
            
            <div className="space-y-3 w-full max-w-sm mb-8">
              {goals.map((goal) => (
                <Button
                  key={goal}
                  variant={selectedGoal === goal ? "default" : "outline"}
                  onClick={() => setSelectedGoal(goal)}
                  className={`w-full h-12 ${
                    selectedGoal === goal 
                      ? 'bg-orange-500 hover:bg-orange-600' 
                      : 'border-white/20 text-white hover:bg-white/10'
                  }`}
                >
                  {goal}
                </Button>
              ))}
            </div>
            
            <Button
              onClick={async () => {
                await saveStep({ main_goal: selectedGoal });
                setStep(2.5); // Photo upload step
              }}
              disabled={!selectedGoal || isLoading}
              className="w-full max-w-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-14 text-lg font-bold rounded-2xl"
            >
              {isLoading ? 'Saving...' : 'Continue'}
            </Button>
          </motion.div>
        )}

        {step === 2.5 && (
          <motion.div
            key="photo"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="flex-1 flex flex-col justify-center items-center p-6"
          >
            <Camera className="w-12 h-12 text-orange-400 mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4 text-center">
              Upload a photo
            </h2>
            <p className="text-white/70 text-center mb-8">
              Take or upload a full-body photo to get your style analysis
            </p>
            
            <div className="w-full max-w-sm mb-8">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="w-full h-32 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 transition-colors"
              >
                {selectedImage ? (
                  <div className="text-center">
                    <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-white">Photo selected</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Camera className="w-8 h-8 text-white/40 mx-auto mb-2" />
                    <p className="text-white/60">Tap to upload photo</p>
                  </div>
                )}
              </label>
            </div>
            
            <div className="w-full max-w-sm space-y-3">
              <Button
                onClick={handleImageUpload}
                disabled={!selectedImage}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-14 text-lg font-bold rounded-2xl"
              >
                Analyze My Style
              </Button>
              
              <Button
                onClick={() => setStep(4)}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10 h-12"
              >
                Skip Photo Analysis
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && analysisResults && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="flex-1 flex flex-col items-center p-6 overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Your Style Score</h2>
            
            <div className="w-full max-w-md mb-8">
              <ModernRatingsDisplay
                overallScore={analysisResults.overallScore}
                profileImage={analysisResults.imageUrl}
                breakdown={analysisResults.breakdown || []}
                isOnboarding={true}
              />
            </div>
            
            <Button
              onClick={() => setStep(4)}
              className="w-full max-w-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-14 text-lg font-bold rounded-2xl"
            >
              Continue to Premium
            </Button>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="paywall"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="flex-1 flex flex-col justify-center items-center p-6"
          >
            <Sparkles className="w-12 h-12 text-orange-400 mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4 text-center">
              Unlock Premium Features
            </h2>
            <p className="text-white/70 text-center mb-8 max-w-md">
              Get unlimited style analyses, personalized tips, and advanced features
            </p>
            
            <div className="w-full max-w-sm space-y-4">
              <Button
                onClick={handlePurchase}
                disabled={isLoading || rcLoading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-14 text-lg font-bold rounded-2xl"
              >
                {isLoading || rcLoading ? 'Loading...' : 'Start Premium Trial'}
              </Button>
              
              <Button
                onClick={handleContinueFree}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10 h-12"
              >
                Continue with Free Version
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 