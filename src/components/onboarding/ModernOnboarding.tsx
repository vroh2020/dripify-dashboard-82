import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { onboardingSteps } from './data/constants';
import {
  HeardAboutStep,
  AgeRangeStep,
  GenderStep,
  StyleGoalStep,
  CategoryStep,
  BudgetStep,
  BrandsStep,
  ColorVibeStep,
  OccasionsStep,
  SelfieStep,
  WeeklyReportsStep,
  InstantSuggestionsStep,
  PaletteStep,
  ShopFrequencyStep,
  FinalConfirmStep,
  AccountChoiceStep,
  PaywallStep,
  WelcomeStep
} from './steps';
import { supabase } from '@/integrations/supabase/client';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { StyleLoadingOverlay } from '@/components/StyleLoadingOverlay';
import { analyzeStyle } from '@/utils/imageAnalysis';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { toast } from '@/hooks/use-toast';

interface ModernOnboardingProps {
  onComplete: (userData: any) => void;
}

const getDeviceId = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await Device.getId();
      return info.identifier;
    } catch (error) {
      console.error('Failed to get device ID:', error);
      return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }
  return `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const ModernOnboarding = ({ onComplete }: ModernOnboardingProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [deviceId, setDeviceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [paywallShown, setPaywallShown] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const {
    isLoading: isRevCatLoading,
    offerings,
    purchaseProduct,
  } = useRevenueCat();

  useEffect(() => {
    getDeviceId().then(id => {
      setDeviceId(id);
      setLoading(false);
    });
  }, []);

  const saveStep = async (stepId, value) => {
    setSaving(true);
    setError('');
    let saveValue = value;
    
    try {
      // If selfie, upload to Supabase storage and save URL
      if (stepId === 'selfie' && value instanceof File) {
        const filePath = `${deviceId}/selfie_${Date.now()}.jpg`;
        const { data, error: uploadError } = await supabase.storage
          .from('onboarding-selfies')
          .upload(filePath, value);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('onboarding-selfies').getPublicUrl(filePath);
        saveValue = urlData?.publicUrl || '';
      }
      
      // Upsert into temp_onboard_users
      const updateObj = {
        device_id: deviceId,
        onboarding_step: stepIndex + 1,
        [stepId]: saveValue
      };
      
      // If last step, mark completed
      if (stepIndex + 1 === onboardingSteps.length) {
        (updateObj as any).completed = true;
      }
      
      const { error: dbError } = await (supabase as any)
        .from('temp_onboard_users')
        .upsert(updateObj, { onConflict: 'device_id' });
        
      if (dbError) throw dbError;
      setAnswers(prev => ({ ...prev, [stepId]: saveValue }));
      
    } catch (e) {
      setError('Failed to save. Please try again.');
      console.error('Onboarding save error:', e);
      toast({
        title: "Save Failed",
        description: "Failed to save your answer. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async (value) => {
    const step = onboardingSteps[stepIndex];
    await saveStep(step.id, value);
    
    if (stepIndex < onboardingSteps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      setPaywallShown(true);
    }
  };

  const handleAccountChoice = async (choice) => {
    await saveStep('account_choice', choice);
    setStepIndex(stepIndex + 1);
  };

  const handlePaywallPurchase = async () => {
    if (!offerings || offerings.length === 0) {
      setError('No subscription options available. Please try again later.');
      return;
    }
    
    const product = offerings[0]?.availablePackages?.[0]?.product;
    if (!product) {
      setError('No subscription product found.');
      return;
    }
    
    setSaving(true);
    const result = await purchaseProduct(product.identifier);
    setSaving(false);
    
    if (result) {
      setPaywallShown(false);
      onComplete({ ...answers, premium: true });
    } else {
      setError('Purchase failed or was cancelled.');
    }
  };

  const handlePaywallContinueFree = () => {
    setPaywallShown(false);
    onComplete({ ...answers, premium: false });
  };

  // Handle selfie analysis
  const handleSelfieAnalysis = async (file: File) => {
    if (!file) return;
    
    setIsAnalyzing(true);
    try {
      const result = await analyzeStyle(file);
      setAnalysisResult(result);
      await saveStep('selfie_analysis', result);
    } catch (error) {
      console.error('Analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze your photo. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-[#1A1F2C] via-[#2C1F3D] to-[#1A1F2C] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  if (saving) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-[#1A1F2C] via-[#2C1F3D] to-[#1A1F2C] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-white/70">Saving your answer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-[#1A1F2C] via-[#2C1F3D] to-[#1A1F2C] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button 
            onClick={() => setError('')}
            className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg text-white"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (paywallShown) {
    if (isRevCatLoading || saving) {
      return (
        <div className="min-h-[100dvh] bg-gradient-to-br from-[#1A1F2C] via-[#2C1F3D] to-[#1A1F2C] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-white/70">Loading subscription options...</p>
          </div>
        </div>
      );
    }
    return <PaywallStep onPurchase={handlePaywallPurchase} onContinueFree={handlePaywallContinueFree} />;
  }

  const step = onboardingSteps[stepIndex];
  
  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#1A1F2C] via-[#2C1F3D] to-[#1A1F2C] relative overflow-hidden">
      <AnimatePresence mode="wait">
        {(() => {
          switch (step.id) {
            case 'welcome':
              return <WelcomeStep key="welcome" onNext={() => setStepIndex(stepIndex + 1)} />;
            case 'heard-about':
              return <HeardAboutStep key="heard-about" onNext={handleNext} />;
            case 'age-range':
              return <AgeRangeStep key="age-range" onNext={handleNext} />;
            case 'gender':
              return <GenderStep key="gender" onNext={handleNext} />;
            case 'style-goal':
              return <StyleGoalStep key="style-goal" onNext={handleNext} />;
            case 'category':
              return <CategoryStep key="category" onNext={handleNext} />;
            case 'budget':
              return <BudgetStep key="budget" onNext={handleNext} />;
            case 'brands':
              return <BrandsStep key="brands" onNext={handleNext} />;
            case 'color-vibe':
              return <ColorVibeStep key="color-vibe" onNext={handleNext} />;
            case 'occasions':
              return <OccasionsStep key="occasions" onNext={handleNext} />;
            case 'selfie':
              return <SelfieStep key="selfie" onNext={handleNext} />;
            case 'weekly-reports':
              return <WeeklyReportsStep key="weekly-reports" onNext={handleNext} />;
            case 'instant-suggestions':
              return <InstantSuggestionsStep key="instant-suggestions" onNext={handleNext} />;
            case 'palette':
              return <PaletteStep key="palette" onNext={handleNext} />;
            case 'shop-frequency':
              return <ShopFrequencyStep key="shop-frequency" onNext={handleNext} />;
            case 'final-confirm':
              return <FinalConfirmStep key="final-confirm" onNext={() => setStepIndex(stepIndex + 1)} />;
            case 'account-choice':
              return <AccountChoiceStep key="account-choice" onNext={handleAccountChoice} />;
            case 'paywall':
              return <PaywallStep key="paywall" onPurchase={handlePaywallPurchase} onContinueFree={handlePaywallContinueFree} />;
            default:
              return <div key="unknown" className="flex items-center justify-center min-h-full text-white">Unknown step</div>;
          }
        })()}
      </AnimatePresence>
      
      {/* Style Loading Overlay */}
      <StyleLoadingOverlay 
        isAnalyzing={isAnalyzing}
        onTimeout={() => setIsAnalyzing(false)}
      />
    </div>
  );
};
