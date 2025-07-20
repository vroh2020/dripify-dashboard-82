import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { subscriptionService } from '@/services/subscriptionService';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Crown, Check, Sparkles, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PurchasesPackage } from '@revenuecat/purchases-capacitor';

interface OnboardingStepProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onNext?: () => void;
  nextDisabled?: boolean;
  showNext?: boolean;
  step: number;
  totalSteps: number;
}

const OnboardingStepComponent: React.FC<OnboardingStepProps> = ({
  title,
  subtitle,
  children,
  onNext,
  nextDisabled = false,
  showNext = true,
  step,
  totalSteps
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex flex-col"
    >
      {/* Progress Bar */}
      <div className="w-full bg-black/50 h-1">
        <div 
          className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-500"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-8">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {subtitle && <p className="text-white/70">{subtitle}</p>}
          </div>

          {/* Content */}
          <div className="space-y-4">
            {children}
          </div>

          {/* Next Button */}
          {showNext && onNext && (
            <Button
              onClick={onNext}
              disabled={nextDisabled}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              Continue <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const OptionButton: React.FC<{
  title: string;
  selected: boolean;
  onClick: () => void;
  autoAdvance?: boolean;
}> = ({ title, selected, onClick, autoAdvance }) => {
  const handleClick = () => {
    onClick();
    if (autoAdvance) {
      // Auto-advance after selection
      setTimeout(() => {
        // This will be handled by the parent component
      }, 600);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full p-4 rounded-xl border-2 transition-all duration-300 text-left ${
        selected
          ? 'border-orange-500 bg-orange-500/20 text-white scale-105'
          : 'border-white/20 bg-white/5 text-white hover:border-white/40'
      }`}
    >
      {title}
    </button>
  );
};

const PaywallComponent: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const packages = subscriptionService.getAvailablePackages();
  const monthlyPackage = packages.find(p => p.product.identifier.includes('1m'));
  const weeklyPackage = packages.find(p => p.product.identifier.includes('1w'));
  
  // Set default selection
  useEffect(() => {
    if (monthlyPackage) {
      setSelectedPackage(monthlyPackage);
    } else if (weeklyPackage) {
      setSelectedPackage(weeklyPackage);
    }
  }, [monthlyPackage, weeklyPackage]);

  const handlePurchase = async () => {
    if (!selectedPackage) {
      toast({ title: "Please select a plan", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await subscriptionService.purchasePackage(selectedPackage);
      
      if (result.success) {
        toast({
          title: "Welcome to Premium! 🎉",
          description: "Your subscription is now active!",
        });
        onComplete();
      } else {
        toast({
          title: "Purchase Failed",
          description: result.error || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Purchase Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen bg-gradient-to-br from-indigo-900/60 via-purple-800/40 to-black flex flex-col justify-center items-center px-6 py-8"
    >
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Crown className="w-16 h-16 text-orange-400 mx-auto" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white">Unlock Premium</h1>
          <p className="text-white/70">Get unlimited style analyses and personalized recommendations</p>
        </div>

        {/* Features */}
        <div className="space-y-3">
          {[
            'Unlimited outfit analyses',
            'Personalized style reports',
            'Early access to trends',
            'Advanced AI insights',
            'Priority support'
          ].map((feature, index) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center space-x-3"
            >
              <Check className="w-5 h-5 text-orange-400" />
              <span className="text-white/80 text-sm">{feature}</span>
            </motion.div>
          ))}
        </div>

        {/* Plan Selection */}
        <div className="space-y-3">
          {weeklyPackage && (
            <button
              onClick={() => setSelectedPackage(weeklyPackage)}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                selectedPackage?.product.identifier === weeklyPackage.product.identifier
                  ? 'border-orange-500 bg-orange-500/20'
                  : 'border-white/20 bg-white/5'
              }`}
            >
              <div className="flex justify-between items-center text-white">
                <span>{weeklyPackage.product.title}</span>
                <span className="font-bold">{weeklyPackage.product.priceString}</span>
              </div>
            </button>
          )}
          
          {monthlyPackage && (
            <button
              onClick={() => setSelectedPackage(monthlyPackage)}
              className={`w-full p-4 rounded-xl border-2 transition-all relative ${
                selectedPackage?.product.identifier === monthlyPackage.product.identifier
                  ? 'border-orange-500 bg-orange-500/20'
                  : 'border-white/20 bg-white/5'
              }`}
            >
              <div className="absolute -top-2 left-4">
                <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                  POPULAR
                </span>
              </div>
              <div className="flex justify-between items-center text-white pt-2">
                <span>{monthlyPackage.product.title}</span>
                <span className="font-bold">{monthlyPackage.product.priceString}</span>
              </div>
            </button>
          )}
        </div>

        {/* Purchase Button */}
        <Button
          onClick={handlePurchase}
          disabled={isLoading || !selectedPackage}
          className="w-full h-16 text-lg font-bold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              <span>Processing...</span>
            </div>
          ) : (
            <>
              <Crown className="mr-2 h-5 w-5" />
              Start Premium
            </>
          )}
        </Button>

        <p className="text-center text-white/40 text-xs">
          Cancel anytime. No commitment required.
        </p>
      </div>
    </motion.div>
  );
};

export const NewOnboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const { updateOnboardingData, setCurrentStep: setStoreStep } = useAppStore();
  const { toast } = useToast();

  // Onboarding data state
  const [selectedOption, setSelectedOption] = useState('');

  const totalSteps = 8; // Simplified to 8 key steps

  const steps = [
    {
      title: "Welcome to Dripify AI",
      subtitle: "Your personal AI style assistant",
      field: null,
      options: null
    },
    {
      title: "How did you hear about us?",
      field: "heard_about",
      options: ["Social Media", "Friend", "App Store", "Google", "Other"]
    },
    {
      title: "What's your age range?",
      field: "age_range", 
      options: ["Under 18", "18-24", "25-34", "35-44", "45+"]
    },
    {
      title: "What's your gender?",
      field: "gender",
      options: ["Male", "Female", "Non-binary", "Prefer not to say"]
    },
    {
      title: "What's your style goal?",
      field: "style_goal",
      options: ["Be more fashionable", "Save time", "Discover new looks", "Build confidence"]
    },
    {
      title: "Your clothing style?", 
      field: "clothing_category",
      options: ["Casual", "Business", "Streetwear", "Athletic", "Formal"]
    },
    {
      title: "Monthly fashion budget?",
      field: "budget", 
      options: ["Under $100", "$100-$250", "$250-$500", "$500+"]
    },
    {
      title: "How often do you shop?",
      field: "shop_frequency",
      options: ["Weekly", "Monthly", "Seasonally", "Rarely"]
    }
  ];

  const handleNext = async () => {
    const step = steps[currentStep];
    
    // Save data if this step has a field
    if (step.field && selectedOption) {
      updateOnboardingData({ [step.field]: selectedOption });
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setStoreStep(currentStep + 1);
      setSelectedOption('');
    } else {
      // Last step - save data and show paywall
      if (step.field && selectedOption) {
        updateOnboardingData({ [step.field]: selectedOption });
      }
      await saveOnboardingData();
      setShowPaywall(true);
    }
  };

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
    
    // Auto-advance after 600ms for better UX
    setTimeout(() => {
      handleNext();
    }, 600);
  };

  const saveOnboardingData = async () => {
    try {
      const { user } = useAppStore.getState();
      if (!user) return;

      if (user.isAnonymous) {
        // Save to temp_onboard_users for anonymous users
        const { error } = await supabase
          .from('temp_onboard_users')
          .upsert({
            device_id: user.deviceId,
            completed: false, // Will be marked complete after subscription
            onboarding_step: totalSteps,
            ...useAppStore.getState().onboardingData
          });
        
        if (error) throw error;
      } else {
        // Save to profiles for authenticated users
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            onboarding_completed: false, // Will be marked complete after subscription
            ...useAppStore.getState().onboardingData
          });
        
        if (error) throw error;
      }
      
      console.log('✅ Onboarding data saved');
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      toast({
        title: "Save Error",
        description: "Failed to save progress, but you can continue.",
        variant: "destructive",
      });
    }
  };

  const handlePaywallComplete = async () => {
    try {
      const { user, setOnboardingCompleted } = useAppStore.getState();
      
      // Mark onboarding as complete
      if (user?.isAnonymous) {
        await supabase
          .from('temp_onboard_users')
          .update({ completed: true })
          .eq('device_id', user.deviceId);
      } else if (user) {
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id);
      }
      
      setOnboardingCompleted(true);
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Continue anyway
      useAppStore.getState().setOnboardingCompleted(true);
      onComplete();
    }
  };

  if (showPaywall) {
    return <PaywallComponent onComplete={handlePaywallComplete} />;
  }

  const step = steps[currentStep];

  return (
    <AnimatePresence mode="wait">
      <OnboardingStepComponent
        key={currentStep}
        title={step.title}
        subtitle={step.subtitle}
        step={currentStep + 1}
        totalSteps={totalSteps}
        onNext={step.options ? undefined : handleNext}
        nextDisabled={step.options ? !selectedOption : false}
        showNext={!step.options || currentStep === 0}
      >
        {step.options ? (
          <div className="space-y-3">
            {step.options.map((option) => (
              <OptionButton
                key={option}
                title={option}
                selected={selectedOption === option}
                onClick={() => handleOptionSelect(option)}
                autoAdvance
              />
            ))}
          </div>
        ) : (
          <div className="text-center space-y-4">
            <Sparkles className="w-16 h-16 text-orange-400 mx-auto" />
            <p className="text-white/80">Let's personalize your style journey</p>
          </div>
        )}
      </OnboardingStepComponent>
    </AnimatePresence>
  );
};