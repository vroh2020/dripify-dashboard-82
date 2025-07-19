import React, { useState, useEffect } from 'react';
import { Device } from '@capacitor/device';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingStep } from './OnboardingStep';
import { OnboardingOption } from './OnboardingOption';
import { OnboardingPhotoPicker } from './OnboardingPhotoPicker';
import { StyleLoadingOverlay } from '../StyleLoadingOverlay';
import { PaywallStep } from './steps/PaywallStep';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles } from 'lucide-react';
import { analyzeStyle } from '@/utils/imageAnalysis';
import { ModernRatingsDisplay } from '../ModernRatingsDisplay';
import { StyleTips } from '../analysis/StyleTips';
import type { ScoreBreakdown, StyleTip } from '@/types/styleTypes';

interface OnboardingData {
  heard_about?: string;
  age_range?: string;
  gender?: string;
  style_goal?: string;
  clothing_category?: string;
  budget?: string;
  favorite_brands?: string[];
  color_preference?: string;
  occasions?: string[];
  selfie_url?: string;
  weekly_reports?: boolean;
  instant_suggestions?: boolean;
  color_palette?: string;
  shop_frequency?: string;
  user_type?: 'free' | 'premium';
}

const TOTAL_STEPS = 16; // Updated to remove account choice step

export const ModernOnboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [deviceId, setDeviceId] = useState<string>('');
  const [data, setData] = useState<OnboardingData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [textInput, setTextInput] = useState('');
  const [multiSelect, setMultiSelect] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<{
    overallScore: number;
    imageUrl: string;
    breakdown?: ScoreBreakdown[];
    tips?: StyleTip[];
    summary?: string;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initDevice = async () => {
      try {
        const info = await Device.getId();
        setDeviceId(info.identifier);
      } catch (error) {
        console.error('Failed to get device ID:', error);
        setDeviceId('web-fallback-' + Date.now());
      }
    };
    initDevice();
  }, []);

  const saveProgress = async (stepData: Partial<OnboardingData>) => {
    if (!deviceId) return;

    setIsLoading(true);
    try {
      const updateData = {
        device_id: deviceId,
        onboarding_step: currentStep + 1,
        ...stepData,
        ...(currentStep === TOTAL_STEPS - 1 && { completed: true })
      };

      const { error } = await supabase
        .from('temp_onboard_users')
        .upsert(updateData, { onConflict: 'device_id' });

      if (error) throw error;

      setData(prev => ({ ...prev, ...stepData }));
    } catch (error) {
      console.error('Error saving progress:', error);
      toast({
        title: "Error",
        description: "Failed to save your progress. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    let stepData: Partial<OnboardingData> = {};

    // Save current step data
    switch (currentStep) {
      case 0: // Welcome
        break;
      case 1: // Where did you hear about us
        stepData = { heard_about: selectedOption };
        break;
      case 2: // Age range
        stepData = { age_range: selectedOption };
        break;
      case 3: // Gender
        stepData = { gender: selectedOption };
        break;
      case 4: // Style goal
        stepData = { style_goal: selectedOption };
        break;
      case 5: // Clothing category
        stepData = { clothing_category: selectedOption };
        break;
      case 6: // Budget
        stepData = { budget: selectedOption };
        break;
      case 7: // Favorite brands
        stepData = { favorite_brands: multiSelect };
        break;
      case 8: // Color preference
        stepData = { color_preference: selectedOption };
        break;
      case 9: // Occasions
        stepData = { occasions: multiSelect };
        break;
      case 10: // Selfie upload - handled separately
        return;
      case 10.5: // Analysis results - skip data saving, just continue
        break;
      case 11: // Weekly reports
        stepData = { weekly_reports: selectedOption === 'Yes' };
        break;
      case 12: // Instant suggestions
        stepData = { instant_suggestions: selectedOption === 'Yes' };
        break;
      case 13: // Color palette
        stepData = { color_palette: selectedOption };
        break;
      case 14: // Shop frequency
        stepData = { shop_frequency: selectedOption };
        break;
      case 15: // Final confirmation - show paywall
        console.log('🎯 ModernOnboarding: Triggering paywall from step 15');
        setShowPaywall(true);
        return;
    }

    await saveProgress(stepData);
    
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(prev => prev + 1);
      setSelectedOption('');
      setTextInput('');
      setMultiSelect([]);
    } else {
      onComplete();
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    try {
      const analysisResult = await analyzeStyle(selectedImage, true); // true for onboarding
      setAnalysisResults(analysisResult);
      setData(prev => ({ ...prev, selfie_url: analysisResult.imageUrl }));
      await saveProgress({ selfie_url: analysisResult.imageUrl });
      
      // Go to analysis results step instead of next step
      setCurrentStep(10.5);
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze your photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePaywallComplete = async (purchased: boolean) => {
    setShowPaywall(false);
    
    if (purchased) {
      // User purchased - mark as premium and complete onboarding
      await saveProgress({ 
        user_type: 'premium',
        completed: true 
      });
      
      toast({
        title: "Welcome to Premium! 🎉",
        description: "You now have unlimited access to all style features!",
      });
    } else {
      // User chose free - mark as free user and complete onboarding
      await saveProgress({ 
        user_type: 'free',
        completed: true 
      });
      
      toast({
        title: "Welcome! 👋",
        description: "You can always upgrade to premium later for unlimited features!",
      });
    }
    
    // Complete onboarding for both cases
    onComplete();
  };

  if (isAnalyzing) {
    return <StyleLoadingOverlay isAnalyzing={isAnalyzing} />;
  }

  if (showPaywall) {
    console.log('🎯 ModernOnboarding: Rendering PaywallStep, showPaywall =', showPaywall);
    return (
      <PaywallStep
        onPurchase={() => handlePaywallComplete(true)}
        onContinueFree={() => handlePaywallComplete(false)}
      />
    );
  }

  const renderStep = () => {
    const stepProps = {
      isLoading,
      currentStep: currentStep + 1,
      totalSteps: TOTAL_STEPS
    };

    switch (currentStep) {
      case 0:
        return (
          <OnboardingStep
            title="Welcome to Dripify AI"
            subtitle="Your personal AI style assistant"
            onNext={handleNext}
            nextButtonText="Let's get started"
            {...stepProps}
          >
            <div className="text-center">
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
                className="mb-6"
              >
                <Sparkles className="w-16 h-16 text-orange-400 mx-auto" />
              </motion.div>
              <p className="text-white/70 text-lg">
                Get personalized style recommendations powered by AI
              </p>
            </div>
          </OnboardingStep>
        );

      case 1:
        return (
          <OnboardingStep
            title="Where did you hear about Dripify AI?"
            onNext={handleNext}
            nextButtonDisabled={!selectedOption}
            {...stepProps}
          >
            <div className="space-y-3">
              {[
                { icon: '📱', title: 'Instagram' },
                { icon: '👥', title: 'Facebook' },
                { icon: '🎵', title: 'TikTok' },
                { icon: '📺', title: 'YouTube' },
                { icon: '🔍', title: 'Google' },
                { icon: '📺', title: 'TV' },
                { icon: '👨‍👩‍👧‍👦', title: 'Friend or family' },
              ].map((option) => (
                <OnboardingOption
                  key={option.title}
                  icon={option.icon}
                  title={option.title}
                  selected={selectedOption === option.title}
                  onClick={() => setSelectedOption(option.title)}
                />
              ))}
            </div>
          </OnboardingStep>
        );

      case 2:
        return (
          <OnboardingStep
            title="What's your age range?"
            onNext={handleNext}
            nextButtonDisabled={!selectedOption}
            {...stepProps}
          >
            <div className="space-y-3">
              {[
                'Under 18',
                '18-24',
                '25-34',
                '35-44',
                '45+'
              ].map((age) => (
                <OnboardingOption
                  key={age}
                  title={age}
                  selected={selectedOption === age}
                  onClick={() => setSelectedOption(age)}
                />
              ))}
            </div>
          </OnboardingStep>
        );

      case 3:
        return (
          <OnboardingStep
            title="What's your gender identity?"
            subtitle="This helps us personalize your recommendations"
            onNext={handleNext}
            nextButtonDisabled={!selectedOption}
            {...stepProps}
          >
            <div className="space-y-3">
              {[
                'Male',
                'Female',
                'Non-binary',
                'Prefer not to say'
              ].map((gender) => (
                <OnboardingOption
                  key={gender}
                  title={gender}
                  selected={selectedOption === gender}
                  onClick={() => setSelectedOption(gender)}
                />
              ))}
            </div>
          </OnboardingStep>
        );

      case 4:
        return (
          <OnboardingStep
            title="What's your primary style goal?"
            onNext={handleNext}
            nextButtonDisabled={!selectedOption}
            {...stepProps}
          >
            <div className="space-y-3">
              {[
                'Be more fashionable',
                'Save time getting dressed',
                'Discover new outfits',
                'Build confidence',
                'Express my personality'
              ].map((goal) => (
                <OnboardingOption
                  key={goal}
                  title={goal}
                  selected={selectedOption === goal}
                  onClick={() => setSelectedOption(goal)}
                />
              ))}
            </div>
          </OnboardingStep>
        );

      case 5:
        return (
          <OnboardingStep
            title="Which clothing category fits you best?"
            onNext={handleNext}
            nextButtonDisabled={!selectedOption}
            {...stepProps}
          >
            <div className="space-y-3">
              {[
                'Casual',
                'Business',
                'Streetwear',
                'Active/Athletic',
                'Formal'
              ].map((category) => (
                <OnboardingOption
                  key={category}
                  title={category}
                  selected={selectedOption === category}
                  onClick={() => setSelectedOption(category)}
                />
              ))}
            </div>
          </OnboardingStep>
        );

      case 6:
        return (
          <OnboardingStep
            title="What's your monthly fashion budget?"
            onNext={handleNext}
            nextButtonDisabled={!selectedOption}
            {...stepProps}
          >
            <div className="space-y-3">
              {[
                'Under $100',
                '$100-$250',
                '$250-$500',
                '$500-$1000',
                'Over $1000'
              ].map((budget) => (
                <OnboardingOption
                  key={budget}
                  title={budget}
                  selected={selectedOption === budget}
                  onClick={() => setSelectedOption(budget)}
                />
              ))}
            </div>
          </OnboardingStep>
        );

      case 7:
        return (
          <OnboardingStep
            title="Name your top 3 favorite brands"
            subtitle="Separate with commas"
            onNext={handleNext}
            nextButtonDisabled={multiSelect.length === 0}
            {...stepProps}
          >
            <div className="space-y-3">
              {[
                'Nike',
                'Zara',
                'H&M',
                'Adidas',
                'Gucci',
                'Prada',
                'Louis Vuitton',
                'Chanel'
              ].map((brand) => (
                <OnboardingOption
                  key={brand}
                  title={brand}
                  selected={multiSelect.includes(brand)}
                  onClick={() => {
                    if (multiSelect.includes(brand)) {
                      setMultiSelect(prev => prev.filter(item => item !== brand));
                    } else {
                      setMultiSelect(prev => [...prev, brand]);
                    }
                  }}
                />
              ))}
            </div>
          </OnboardingStep>
        );

      case 8:
        return (
          <OnboardingStep
            title="Do you prefer vibrant or neutral colors?"
            onNext={handleNext}
            nextButtonDisabled={!selectedOption}
            {...stepProps}
          >
            <div className="space-y-3">
              {[
                'Vibrant colors',
                'Neutral colors',
                'Both equally'
              ].map((preference) => (
                <OnboardingOption
                  key={preference}
                  title={preference}
                  selected={selectedOption === preference}
                  onClick={() => setSelectedOption(preference)}
                />
              ))}
            </div>
          </OnboardingStep>
        );

      case 9:
        return (
          <OnboardingStep
            title="Which occasions do you dress for most?"
            subtitle="Select all that apply"
            onNext={handleNext}
            nextButtonDisabled={multiSelect.length === 0}
            {...stepProps}
          >
            <div className="space-y-3">
              {[
                'Work/Office',
                'Date nights',
                'Travel',
                'Gym/Fitness',
                'Social events',
                'Casual outings'
              ].map((occasion) => (
                <OnboardingOption
                  key={occasion}
                  title={occasion}
                  selected={multiSelect.includes(occasion)}
                  onClick={() => {
                    if (multiSelect.includes(occasion)) {
                      setMultiSelect(prev => prev.filter(item => item !== occasion));
                    } else {
                      setMultiSelect(prev => [...prev, occasion]);
                    }
                  }}
                />
              ))}
            </div>
          </OnboardingStep>
        );

      case 10:
        return (
          <motion.div
            key="test-photo"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex flex-col"
          >
            <div className="flex-1 flex flex-col justify-center items-center px-6 py-8">
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
                className="mb-6"
              >
                <Sparkles className="w-12 h-12 text-orange-400 mx-auto" />
              </motion.div>
              
              <div className="space-y-4 text-center mb-8">
                <h2 className="text-2xl font-bold text-white">Let's test it out!</h2>
                <p className="text-white/70 text-base leading-relaxed max-w-sm">
                  Upload a photo to get your first style rating and see the magic in action
                </p>
              </div>

              <div className="w-full max-w-sm">
                <OnboardingPhotoPicker 
                  selectedImage={selectedImage}
                  onImageSelect={setSelectedImage}
                />
              </div>
            </div>

            {selectedImage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="px-6 pb-8"
              >
                <Button
                  onClick={handleImageUpload}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl"
                >
                  <Sparkles className="mr-3 h-5 w-5" />
                  Get My Style Rating
                </Button>
              </motion.div>
            )}
          </motion.div>
        );

      case 10.5: // Analysis Results Step
        return (
          <motion.div
            key="analysis-results"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex flex-col overflow-y-auto"
          >
            <div className="flex-1 flex flex-col justify-center items-center px-6 py-8">
              {analysisResults && (
                <div className="w-full max-w-2xl mx-auto space-y-6">
                  {/* Modern Ratings Display */}
                  <ModernRatingsDisplay
                    overallScore={analysisResults.overallScore}
                    profileImage={analysisResults.imageUrl}
                    breakdown={analysisResults.breakdown || []}
                    isOnboarding={true}
                  />

                  {/* Tips Section */}
                  {analysisResults.tips && analysisResults.tips.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 border border-white/10"
                    >
                      <StyleTips tips={analysisResults.tips} />
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="px-6 pb-8"
            >
              <Button
                onClick={handleNext}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl"
              >
                Continue
              </Button>
            </motion.div>
          </motion.div>
        );

      case 11:
        return (
          <OnboardingStep
            title="Would you like weekly AI style reports?"
            onNext={handleNext}
            nextButtonDisabled={!selectedOption}
            {...stepProps}
          >
            <div className="space-y-3">
              {['Yes', 'No'].map((option) => (
                <OnboardingOption
                  key={option}
                  title={option}
                  selected={selectedOption === option}
                  onClick={() => setSelectedOption(option)}
                />
              ))}
            </div>
          </OnboardingStep>
        );

      case 12:
        return (
          <OnboardingStep
            title="Would you like instant AI outfit suggestions?"
            onNext={handleNext}
            nextButtonDisabled={!selectedOption}
            {...stepProps}
          >
            <div className="space-y-3">
              {['Yes', 'No'].map((option) => (
                <OnboardingOption
                  key={option}
                  title={option}
                  selected={selectedOption === option}
                  onClick={() => setSelectedOption(option)}
                />
              ))}
            </div>
          </OnboardingStep>
        );

      case 13:
        return (
          <OnboardingStep
            title="What's your favorite color palette?"
            onNext={handleNext}
            nextButtonDisabled={!selectedOption}
            {...stepProps}
          >
            <div className="space-y-3">
              {[
                'Earth Tones',
                'Monochrome',
                'Pastels',
                'Bold & Bright'
              ].map((palette) => (
                <OnboardingOption
                  key={palette}
                  title={palette}
                  selected={selectedOption === palette}
                  onClick={() => setSelectedOption(palette)}
                />
              ))}
            </div>
          </OnboardingStep>
        );

      case 14:
        return (
          <OnboardingStep
            title="How often do you shop for clothes?"
            onNext={handleNext}
            nextButtonDisabled={!selectedOption}
            {...stepProps}
          >
            <div className="space-y-3">
              {[
                'Weekly',
                'Monthly',
                'Quarterly',
                'Rarely'
              ].map((frequency) => (
                <OnboardingOption
                  key={frequency}
                  title={frequency}
                  selected={selectedOption === frequency}
                  onClick={() => setSelectedOption(frequency)}
                />
              ))}
            </div>
          </OnboardingStep>
        );

      case 15:
        return (
          <OnboardingStep
            title="Perfect! You're all set"
            subtitle="Time to unlock your style potential"
            onNext={handleNext}
            nextButtonText="Continue"
            {...stepProps}
          >
            <div className="text-center">
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="mb-6"
              >
                <Sparkles className="w-16 h-16 text-orange-400 mx-auto" />
              </motion.div>
              <p className="text-white/70 text-lg">
                Ready to see your personalized style recommendations?
              </p>
            </div>
          </OnboardingStep>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black">
      <AnimatePresence mode="wait">
        {renderStep()}
      </AnimatePresence>
    </div>
  );
};