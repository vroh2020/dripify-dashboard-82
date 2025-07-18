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
import { ModernRatingsDisplay } from '../ModernRatingsDisplay';

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
    },
    fullAnalysis: null as any // Store the full analysis result
  });
  const { toast } = useToast();

  // Initialize device ID and restore progress
  useEffect(() => {
    const initDevice = async () => {
      try {
        const { Device } = await import('@capacitor/device');
        const info = await Device.getId();
        setDeviceId(info.identifier);
        console.log('📱 Device ID set:', info.identifier);
        
        // Restore progress from localStorage
        restoreProgress(info.identifier);
      } catch (error) {
        console.error('Error getting device ID:', error);
        const fallbackId = 'web-fallback-' + Date.now();
        setDeviceId(fallbackId);
        console.log('🌐 Using fallback device ID:', fallbackId);
        
        // Restore progress from localStorage
        restoreProgress(fallbackId);
      }
    };

    initDevice();
  }, []);

  const restoreProgress = async (deviceId: string) => {
    try {
      // First try to restore from localStorage
      const cachedProgress = localStorage.getItem('dripify_onboarding_progress');
      if (cachedProgress) {
        const progress = JSON.parse(cachedProgress);
        if (progress.deviceId === deviceId && progress.currentStep > 0) {
          console.log('🔄 Restoring onboarding progress from cache:', progress);
          setCurrentStep(progress.currentStep - 1); // Adjust for 0-based index
          setData(prev => ({ ...prev, ...progress.stepData }));
        }
      }

      // Then try to restore from Supabase
      const { data, error } = await supabase
        .from('temp_onboard_users')
        .select('*')
        .eq('device_id', deviceId)
        .maybeSingle();

      if (error) {
        console.error('Error restoring from Supabase:', error);
        return;
      }

      if (data && data.onboarding_step) {
        console.log('🔄 Restoring onboarding progress from Supabase:', data);
        setCurrentStep(data.onboarding_step - 1); // Adjust for 0-based index
        
        // Restore all saved data
        const restoredData: Partial<OnboardingData> = {};
        if (data.heard_about) restoredData.heard_about = data.heard_about;
        if (data.age_range) restoredData.age_range = data.age_range;
        if (data.gender) restoredData.gender = data.gender;
        if (data.style_goal) restoredData.style_goal = data.style_goal;
        if (data.clothing_category) restoredData.clothing_category = data.clothing_category;
        if (data.budget) restoredData.budget = data.budget;
        if (data.favorite_brands) restoredData.favorite_brands = data.favorite_brands;
        if (data.color_preference) restoredData.color_preference = data.color_preference;
        if (data.occasions) restoredData.occasions = data.occasions;
        if (data.selfie_url) restoredData.selfie_url = data.selfie_url;
        if (data.weekly_reports !== undefined) restoredData.weekly_reports = data.weekly_reports;
        if (data.instant_suggestions !== undefined) restoredData.instant_suggestions = data.instant_suggestions;
        if (data.color_palette) restoredData.color_palette = data.color_palette;
        if (data.shop_frequency) restoredData.shop_frequency = data.shop_frequency;
        
        setData(restoredData);
      }
    } catch (error) {
      console.error('Error restoring progress:', error);
    }
  };

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

      // Save to Supabase
      const { error } = await supabase
        .from('temp_onboard_users')
        .upsert(updateData, { onConflict: 'device_id' });

      if (error) throw error;

      // Update local state
      setData(prev => ({ ...prev, ...stepData }));

      // Cache progress in localStorage for better persistence
      try {
        const cachedProgress = {
          deviceId,
          currentStep: currentStep + 1,
          stepData,
          timestamp: Date.now()
        };
        localStorage.setItem('dripify_onboarding_progress', JSON.stringify(cachedProgress));
        console.log('✅ Onboarding progress cached in localStorage:', cachedProgress);
      } catch (error) {
        console.error('Error caching onboarding progress:', error);
      }

      console.log('✅ Onboarding progress saved:', updateData);
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
      case 14: // Shop frequency - save data first, then show paywall
        stepData = { shop_frequency: selectedOption };
        await saveProgress(stepData);
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
      // Use the actual image analysis from ScanView
      const { analyzeStyle } = await import('@/utils/imageAnalysis');
      
      console.log('Starting onboarding image analysis...');
      const analysisResult = await analyzeStyle(selectedImage, true); // Set isOnboarding to true
      console.log('Onboarding analysis result received:', analysisResult);
      
      // Store the full analysis result for the ModernRatingsDisplay
      setAnalysisResults({
        score: analysisResult.overallScore,
        breakdown: {
          colorHarmony: Math.floor(Math.random() * 20) + 80,
          styleCoherence: Math.floor(Math.random() * 20) + 80,
          trendAlignment: Math.floor(Math.random() * 20) + 80,
          confidence: Math.floor(Math.random() * 20) + 80
        },
        // Store the full analysis result for proper display
        fullAnalysis: analysisResult
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
      // Mark temp onboarding as complete for guest users
      if (deviceId) {
        await supabase
          .from('temp_onboard_users')
          .update({ 
            completed: true,
            onboarding_step: TOTAL_STEPS,
            completed_at: new Date().toISOString()
          })
          .eq('device_id', deviceId);
        
        console.log('✅ Guest onboarding marked complete for device:', deviceId);
      }

      // If user is authenticated, also mark in profiles table
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await supabase
          .from('profiles')
          .update({ 
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString()
          })
          .eq('id', user.id);
        
        console.log('✅ Authenticated user onboarding marked complete:', user.id);
      }
      
      // Cache onboarding completion in localStorage
      try {
        localStorage.setItem('dripify_onboarding_completed', 'true');
        localStorage.removeItem('dripify_onboarding_progress'); // Clean up progress cache
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

          {/* Modern Ratings Display - Same as ScanView */}
          {analysisResults.fullAnalysis && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <ModernRatingsDisplay
                overallScore={analysisResults.fullAnalysis.overallScore}
                profileImage={analysisResults.fullAnalysis.imageUrl}
                breakdown={analysisResults.fullAnalysis.breakdown || []}
                isOnboarding={true}
              />
            </motion.div>
          )}

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