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
import { Sparkles, Star, Check, Zap, Crown } from 'lucide-react';

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
}

const TOTAL_STEPS = 15; // Updated to remove account choice step

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
  const [showResults, setShowResults] = useState(false);
  const [analysisResults, setAnalysisResults] = useState({
    score: 0,
    breakdown: {
      colorHarmony: 0,
      styleCoherence: 0,
      trendAlignment: 0,
      confidence: 0
    }
  });
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
        stepData = { favorite_brands: textInput.split(',').map(b => b.trim()).filter(Boolean) };
        break;
      case 8: // Color preference
        stepData = { color_preference: selectedOption };
        break;
      case 9: // Occasions
        stepData = { occasions: multiSelect };
        break;
      case 10: // Test photo upload - show results instead of continuing
        setShowResults(true);
        return;
      case 11: // Weekly reports
        stepData = { weekly_reports: selectedOption === 'Yes' };
        break;
      case 12: // Instant suggestions
        stepData = { instant_suggestions: selectedOption === 'Yes' };
        break;
      case 13: // Color palette
        stepData = { color_palette: selectedOption };
        break;
      case 14: // Shop frequency - show paywall
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
      // Simulate analysis with realistic results
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Generate realistic analysis results
      const score = Math.floor(Math.random() * 30) + 70; // 70-100
      setAnalysisResults({
        score,
        breakdown: {
          colorHarmony: Math.floor(Math.random() * 20) + 80,
          styleCoherence: Math.floor(Math.random() * 20) + 80,
          trendAlignment: Math.floor(Math.random() * 20) + 80,
          confidence: Math.floor(Math.random() * 20) + 80
        }
      });
      
      setShowResults(true);
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

  const handleContinueFromResults = async () => {
    setShowResults(false);
    await saveProgress({ selfie_url: 'uploaded' });
    setCurrentStep(prev => prev + 1);
  };

  const handlePaywallComplete = (purchased: boolean) => {
    setShowPaywall(false);
    // Mark onboarding as completed
    markOnboardingComplete();
    onComplete();
  };

  const markOnboardingComplete = async () => {
    try {
      if (deviceId) {
        // Mark temp onboarding as complete
        await supabase
          .from('temp_onboard_users')
          .update({ completed: true })
          .eq('device_id', deviceId);
      }
      
      // Cache onboarding completion in localStorage
      try {
        localStorage.setItem('dripify_onboarding_completed', 'true');
        console.log('✅ Onboarding completion cached in localStorage');
      } catch (error) {
        console.error('Error caching onboarding completion:', error);
      }
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
    }
  };

  if (isAnalyzing) {
    return <StyleLoadingOverlay isAnalyzing={isAnalyzing} />;
  }

  if (showResults) {
    return (
      <motion.div
        key="results"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="min-h-screen bg-gradient-to-b from-purple-900/40 via-purple-800/20 to-black flex flex-col justify-center items-center px-6 py-8 relative overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`,
          }} />
        </div>

        {/* Main Content */}
        <div className="relative z-10 w-full max-w-md space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center"
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
              className="mb-6"
            >
              <Sparkles className="w-16 h-16 text-orange-400 mx-auto" />
            </motion.div>
            
            <h2 className="text-3xl font-bold text-white mb-4">Your Style Analysis</h2>
            <p className="text-white/70 text-base">
              Here's what our AI discovered about your style
            </p>
          </motion.div>

          {/* Score Display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="bg-gradient-to-r from-purple-900/40 to-purple-700/40 rounded-2xl p-6 border border-purple-500/30"
          >
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">{analysisResults.score}</div>
              <div className="text-white/60 text-lg">Style Score</div>
              <div className="text-white/40 text-sm mt-2">Out of 100</div>
            </div>
          </motion.div>

          {/* Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Color Harmony</span>
              <span className="text-white font-semibold">{analysisResults.breakdown.colorHarmony}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Style Coherence</span>
              <span className="text-white font-semibold">{analysisResults.breakdown.styleCoherence}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Trend Alignment</span>
              <span className="text-white font-semibold">{analysisResults.breakdown.trendAlignment}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Confidence</span>
              <span className="text-white font-semibold">{analysisResults.breakdown.confidence}%</span>
            </div>
          </motion.div>

          {/* Continue Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Button
              onClick={handleContinueFromResults}
              className="w-full h-16 text-lg font-bold rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all duration-300 hover:scale-105 shadow-2xl"
            >
              <Sparkles className="mr-3 h-5 w-5" />
              Continue to Premium
            </Button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  if (showPaywall) {
    return (
      <PaywallStep
        onPurchase={() => handlePaywallComplete(true)}
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
            nextButtonDisabled={!textInput.trim()}
            {...stepProps}
          >
            <Input
              placeholder="e.g., Nike, Zara, H&M"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="w-full h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
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