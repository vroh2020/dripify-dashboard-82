import React, { useState, useEffect } from 'react';
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
import { persistenceManager } from '@/utils/persistenceManager';
import { useStrategicPrompts } from '@/hooks/useStrategicPrompts';
import { AppleSignIn } from '@/components/auth/AppleSignIn';
import { StrategicUpgradePrompt } from '@/components/upgrade/StrategicUpgradePrompt';
import { engagementTracker } from '@/utils/engagementTracker';
import { useOnboarding } from '@/hooks/useOnboarding';
import { getDeviceId, resetDeviceId } from '@/utils/device';

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
  const {
    onboarding,
    isLoading: onboardingLoading,
    isError: onboardingError,
    saveOnboarding,
    resetOnboarding,
    refetch: refetchOnboarding
  } = useOnboarding();

  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState<Partial<OnboardingData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (onboardingLoading) return;
    if (onboardingError) {
      setError('Failed to load onboarding state. Please try again.');
      return;
    }
    if (onboarding && onboarding.onboarding_complete && onboarding.subscription_active) {
      // User is done, go to dashboard
      onComplete();
    } else if (onboarding) {
      // Resume at first incomplete step
      setCurrentStep(0); // Or use logic to resume at last incomplete step if desired
      setStepData(onboarding);
    } else {
      setCurrentStep(0);
      setStepData({});
    }
  }, [onboarding, onboardingLoading, onboardingError, onComplete]);

  const handleStepSave = async (updates: Partial<OnboardingData>) => {
    setIsSaving(true);
    setError(null);
    try {
      await saveOnboarding.mutateAsync(updates);
      setStepData(prev => ({ ...prev, ...updates }));
      setCurrentStep(prev => prev + 1);
    } catch (e: any) {
      setError(e.message || 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePaywallSuccess = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await saveOnboarding.mutateAsync({ onboarding_complete: true, subscription_active: true });
      refetchOnboarding();
      onComplete();
    } catch (e: any) {
      setError(e.message || 'Failed to complete onboarding.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await resetOnboarding.mutateAsync();
      await resetDeviceId();
      refetchOnboarding();
      setCurrentStep(0);
      setStepData({});
    } catch (e: any) {
      setError(e.message || 'Failed to reset.');
    } finally {
      setIsSaving(false);
    }
  };

  if (onboardingLoading || isSaving) return <StyleLoadingOverlay isAnalyzing={true} />;
  if (error) return <div className="text-red-500 p-8 text-center">{error}</div>;

  const [selectedOption, setSelectedOption] = useState<string>('');
  const [textInput, setTextInput] = useState('');
  const [multiSelect, setMultiSelect] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<{
    fullAnalysis: any | null; // Store the full analysis result
  }>({
    fullAnalysis: null
  });
  const { toast } = useToast();

  // Strategic prompts hook
  const {
    showAppleSignIn,
    showUpgradePrompt,
    hideAppleSignIn,
    hideUpgradePrompt,
    trackFeatureUsage,
    trackAnalysis,
    userProgress: strategicUserProgress
  } = useStrategicPrompts();

  // Initialize and restore progress
  useEffect(() => {
    const initializeAndRestore = async () => {
      try {
        // Initialize persistence manager
        await persistenceManager.initialize();
        
        // Initialize engagement tracker
        await engagementTracker.initialize();
        
        // Track onboarding start
        engagementTracker.trackEvent('view', { page: 'onboarding_start' });
        
        // Restore progress from localStorage
        const progress = await persistenceManager.getOnboardingProgress();
        if (progress && !progress.completed && progress.currentStep > 0) {
          console.log('🔄 Restoring onboarding progress from cache:', progress);
          setCurrentStep(progress.currentStep - 1); // Adjust for 0-based index
          setData(prev => ({ ...prev, ...progress.stepData }));
          
          // Track onboarding resume
          engagementTracker.trackEvent('interaction', { 
            type: 'onboarding_resume',
            step: progress.currentStep 
          });
        }

        // Also try to restore from Supabase for additional data
        const deviceInfo = persistenceManager.getDeviceInfo();
        if (deviceInfo?.deviceId) {
          const { data: supabaseData, error } = await supabase
            .from('temp_onboard_users')
            .select('*')
            .eq('device_id', deviceInfo.deviceId)
            .maybeSingle();

          if (error) {
            console.error('Error restoring from Supabase:', error);
            return;
          }

          if (supabaseData && supabaseData.onboarding_step) {
            console.log('🔄 Restoring onboarding progress from Supabase:', supabaseData);
            
            // Only update if Supabase has more recent data
            if (supabaseData.onboarding_step > progress?.currentStep || 0) {
              setCurrentStep(supabaseData.onboarding_step - 1); // Adjust for 0-based index
            }
            
            // Restore all saved data
            const restoredData: Partial<OnboardingData> = {};
            if (supabaseData.heard_about) restoredData.heard_about = supabaseData.heard_about;
            if (supabaseData.age_range) restoredData.age_range = supabaseData.age_range;
            if (supabaseData.gender) restoredData.gender = supabaseData.gender;
            if (supabaseData.style_goal) restoredData.style_goal = supabaseData.style_goal;
            if (supabaseData.clothing_category) restoredData.clothing_category = supabaseData.clothing_category;
            if (supabaseData.budget) restoredData.budget = supabaseData.budget;
            if (supabaseData.favorite_brands) restoredData.favorite_brands = supabaseData.favorite_brands;
            if (supabaseData.color_preference) restoredData.color_preference = supabaseData.color_preference;
            if (supabaseData.occasions) restoredData.occasions = supabaseData.occasions;
            if (supabaseData.selfie_url) restoredData.selfie_url = supabaseData.selfie_url;
            if (supabaseData.weekly_reports !== undefined) restoredData.weekly_reports = supabaseData.weekly_reports;
            if (supabaseData.instant_suggestions !== undefined) restoredData.instant_suggestions = supabaseData.instant_suggestions;
            if (supabaseData.color_palette) restoredData.color_palette = supabaseData.color_palette;
            if (supabaseData.shop_frequency) restoredData.shop_frequency = supabaseData.shop_frequency;
            
            setData(prev => ({ ...prev, ...restoredData }));
          }
        }
      } catch (error) {
        console.error('Error restoring progress:', error);
      }
    };

    initializeAndRestore();
  }, []);

  const saveProgress = async (stepData: Partial<OnboardingData>) => {
    setIsLoading(true);
    try {
      const deviceInfo = persistenceManager.getDeviceInfo();
      if (!deviceInfo?.deviceId) {
        console.error('No device ID available for saving progress');
        return;
      }

      const updateData = {
        device_id: deviceInfo.deviceId,
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

      // Save to persistence manager
      await persistenceManager.saveOnboardingProgress({
        currentStep: currentStep + 1,
        stepData,
        completed: currentStep === TOTAL_STEPS - 1
      });

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

    // Track step completion
    engagementTracker.trackConversion('onboarding', `step_${currentStep + 1}_complete`, {
      step: currentStep + 1,
      stepName: getStepName(currentStep + 1)
    });

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

  const getStepName = (step: number): string => {
    const stepNames = [
      'welcome',
      'heard_about',
      'age_range',
      'gender',
      'style_goal',
      'clothing_category',
      'budget',
      'favorite_brands',
      'color_preference',
      'occasions',
      'photo_upload',
      'weekly_reports',
      'instant_suggestions',
      'color_palette',
      'shop_frequency'
    ];
    return stepNames[step - 1] || 'unknown';
  };

  const handleImageUpload = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    try {
      // Track feature usage
      trackFeatureUsage('photo_upload');
      
      // Track analysis start
      engagementTracker.trackEvent('interaction', { 
        type: 'analysis_start',
        step: currentStep + 1
      });
      
      // Use the actual image analysis from ScanView
      const { analyzeStyle } = await import('@/utils/imageAnalysis');
      
      console.log('Starting onboarding image analysis...');
      const analysisResult = await analyzeStyle(selectedImage, true); // Set isOnboarding to true
      console.log('Onboarding analysis result received:', analysisResult);
      
      // Store the full analysis result for the ModernRatingsDisplay
      setAnalysisResults({
        fullAnalysis: analysisResult
      });
      
      setShowResults(true);
      
      // Track analysis completion
      trackAnalysis();
      engagementTracker.trackConversion('analysis', 'onboarding_analysis_complete', {
        step: currentStep + 1,
        hasResults: true
      });
    } catch (error) {
      console.error('Error analyzing image:', error);
      
      // Track analysis error
      engagementTracker.trackError('analysis_failed', {
        step: currentStep + 1,
        error: error.message
      });
      
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
      const deviceInfo = persistenceManager.getDeviceInfo();
      if (deviceInfo?.deviceId) {
        await supabase
          .from('temp_onboard_users')
          .update({ 
            completed: true,
            onboarding_step: TOTAL_STEPS,
            completed_at: new Date().toISOString()
          })
          .eq('device_id', deviceInfo.deviceId);
        
        console.log('✅ Guest onboarding marked complete for device:', deviceInfo.deviceId);
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
          await persistenceManager.saveOnboardingProgress({
            completed: true
          });
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

  const appleSignInTrigger = strategicUserProgress.isPro;
  const upgradePromptTrigger = strategicUserProgress.isPro;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black">
      <AnimatePresence mode="wait">
        {renderStep()}
      </AnimatePresence>
      
      {/* Strategic Prompts */}
      <AnimatePresence>
        {/* Apple Sign-in Prompt */}
        {showAppleSignIn && appleSignInTrigger && (
          <AppleSignIn
            trigger={appleSignInTrigger}
            userProgress={strategicUserProgress}
            onSuccess={(user) => {
              hideAppleSignIn();
              toast({
                title: "Welcome!",
                description: "Your progress has been saved securely.",
              });
            }}
            onCancel={hideAppleSignIn}
          />
        )}
        
        {/* Upgrade Prompt */}
        {showUpgradePrompt && upgradePromptTrigger && (
          <StrategicUpgradePrompt
            trigger={upgradePromptTrigger}
            userContext={strategicUserProgress}
            onUpgrade={() => {
              hideUpgradePrompt();
              // Continue with onboarding or show success
            }}
            onSkip={hideUpgradePrompt}
          />
        )}
      </AnimatePresence>
    </div>
  );
};