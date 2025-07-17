import React, { useState, useEffect } from 'react';
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
// import { Capacitor } from '@capacitor/core';
// import { Device } from '@capacitor/device';

const getDeviceId = async () => {
  // Use Capacitor Device API in real app
  // const info = await Device.getId();
  // return info.identifier;
  return 'mock-device-id'; // placeholder for dev
};

export const ModernOnboarding = ({ onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [deviceId, setDeviceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [paywallShown, setPaywallShown] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
      // temp_onboard_users is not typed in Supabase client, so use 'as any' to avoid type error
      const { error: dbError } = await (supabase as any)
        .from('temp_onboard_users')
        .upsert(updateObj, { onConflict: 'device_id' });
      if (dbError) throw dbError;
      setAnswers(prev => ({ ...prev, [stepId]: saveValue }));
    } catch (e) {
      setError('Failed to save. Please try again.');
      console.error('Onboarding save error:', e);
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
    // Pick the first available product (can be improved to let user choose)
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

  if (loading) return <div>Loading...</div>;
  if (saving) return <div>Saving your answer...</div>;
  if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

  if (paywallShown) {
    if (isRevCatLoading || saving) return <div>Loading subscription options...</div>;
    return <PaywallStep onPurchase={handlePaywallPurchase} onContinueFree={handlePaywallContinueFree} />;
  }

  const step = onboardingSteps[stepIndex];
  switch (step.id) {
    case 'welcome':
      return <WelcomeStep onNext={() => setStepIndex(stepIndex + 1)} />;
    case 'heard-about':
      return <HeardAboutStep onNext={handleNext} />;
    case 'age-range':
      return <AgeRangeStep onNext={handleNext} />;
    case 'gender':
      return <GenderStep onNext={handleNext} />;
    case 'style-goal':
      return <StyleGoalStep onNext={handleNext} />;
    case 'category':
      return <CategoryStep onNext={handleNext} />;
    case 'budget':
      return <BudgetStep onNext={handleNext} />;
    case 'brands':
      return <BrandsStep onNext={handleNext} />;
    case 'color-vibe':
      return <ColorVibeStep onNext={handleNext} />;
    case 'occasions':
      return <OccasionsStep onNext={handleNext} />;
    case 'selfie':
      return <SelfieStep onNext={handleNext} />;
    case 'weekly-reports':
      return <WeeklyReportsStep onNext={handleNext} />;
    case 'instant-suggestions':
      return <InstantSuggestionsStep onNext={handleNext} />;
    case 'palette':
      return <PaletteStep onNext={handleNext} />;
    case 'shop-frequency':
      return <ShopFrequencyStep onNext={handleNext} />;
    case 'final-confirm':
      return <FinalConfirmStep onNext={() => setStepIndex(stepIndex + 1)} />;
    case 'account-choice':
      return <AccountChoiceStep onNext={handleAccountChoice} />;
    case 'paywall':
      return <PaywallStep onPurchase={handlePaywallPurchase} onContinueFree={handlePaywallContinueFree} />;
    default:
      return <div>Unknown step</div>;
  }
};
