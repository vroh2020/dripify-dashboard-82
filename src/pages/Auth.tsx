import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { Sparkles, Camera, Upload } from "lucide-react";
import { Capacitor } from '@capacitor/core';
import { Button } from "@/components/ui/button";
import { requestInAppReview } from '@/utils/inAppReview';

// Import step components
import { NewWelcomeStep } from "@/components/onboarding/steps/NewWelcomeStep";
import { ShoppingFrequencyStep } from "@/components/onboarding/steps/ShoppingFrequencyStep";
import { BudgetRangeStep } from "@/components/onboarding/steps/BudgetRangeStep";
import { StylePreferencesStep } from "@/components/onboarding/steps/StylePreferencesStep";
import { BodyTypeStep } from "@/components/onboarding/steps/BodyTypeStep";
import { FitPreferenceStep } from "@/components/onboarding/steps/FitPreferenceStep";
import { ColorPaletteStep } from "@/components/onboarding/steps/ColorPaletteStep";
import { ShoeSizeStep } from "@/components/onboarding/steps/ShoeSizeStep";
import { BrandAffinityStep } from "@/components/onboarding/steps/BrandAffinityStep";
import { InspirationLinkStep } from "@/components/onboarding/steps/InspirationLinkStep";
import { MainGoalStep } from "@/components/onboarding/steps/MainGoalStep";
import { CelebrationNewStep } from "@/components/onboarding/steps/CelebrationNewStep";
import { ProOfferCard } from "@/components/onboarding/ProOfferCard";
import { StyleLoadingOverlay } from '@/components/StyleLoadingOverlay';
import { ModernRatingsDisplay } from '@/components/ModernRatingsDisplay';

export const AuthOnboardingWizard = () => {
  // Persistent step state
  const stepKey = 'onboarding_step';
  const [step, setStepState] = useState<number>(() => {
    const saved = localStorage.getItem(stepKey);
    return saved ? parseInt(saved, 10) : 1;
  });
  const setStep = (n: number) => {
    setStepState(n);
    localStorage.setItem(stepKey, String(n));
  };
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const lastUserId = useRef<string | undefined>();
  useEffect(() => {
    if (user?.id !== lastUserId.current) {
      console.log('[Auth] User changed:', lastUserId.current, '→', user?.id);
      lastUserId.current = user?.id;
    }
  }, [user?.id]);
  const { checkOnboardingStatus, refetch: refetchOnboardingStatus } = useOnboardingStatus();

  // Add this debug function at the top of your Auth component:
  useEffect(() => {
    console.log('🎯 Onboarding step:', step);
  }, [step]);

  // Save data to Supabase with optimistic UI
  const saveToSupabase = async (data: Record<string, any>) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);
      
      if (error) {
        console.error('Save error:', error);
        toast({
          title: "Save Warning",
          description: "Data saved locally, will retry in background",
          variant: "default"
        });
      } else {
        console.log('✅ Saved to Supabase:', data);
      }
    } catch (error) {
      console.error('Save failed:', error);
      toast({
        title: "Save Warning", 
        description: "Data saved locally, will retry in background",
        variant: "default"
      });
    }
  };

  // REPLACE ALL step handlers with immediate versions:
  const handleShoppingFrequency = (frequency: string) => {
    console.log('🔄 Shopping frequency selected:', frequency);
    setStep(3); // Advance immediately
    saveToSupabase({ referral_source: `shopping_frequency:${frequency}` }); // Save in background
  };

  const handleBudgetRange = (budget: string) => {
    console.log('🔄 Budget range selected:', budget);
    setStep(4); // Advance immediately
    saveToSupabase({ budget_range: budget }); // Save in background
  };

  const handleStylePreferences = (preferences: string[]) => {
    console.log('🔄 Style preferences selected:', preferences);
    setStep(5); // Advance immediately
    saveToSupabase({ style_preferences: preferences }); // Save in background
  };

  const handleBodyType = (bodyType: string) => {
    console.log('🔄 Body type selected:', bodyType);
    setStep(6); // Advance immediately
    saveToSupabase({ body_type: bodyType }); // Save in background
  };

  const handleFitPreference = (fit: string) => {
    console.log('🔄 Fit preference selected:', fit);
    setStep(7); // Advance immediately
    saveToSupabase({ style_preference: fit }); // Save in background
  };

  const handleColorPalette = (colors: string[]) => {
    console.log('🔄 Color palette selected:', colors);
    setStep(8); // Advance immediately
    saveToSupabase({ color_preferences: colors }); // Save in background
  };

  const handleShoeSize = (size: string) => {
    console.log('🔄 Shoe size selected:', size);
    setStep(9); // Advance immediately
    saveToSupabase({ size_info: { shoe_size: size } }); // Save in background
  };

  const handleBrandAffinity = (brands: string[]) => {
    console.log('🔄 Brand affinity selected:', brands);
    setStep(10); // Advance immediately
    saveToSupabase({ favorite_brands: brands }); // Save in background
  };

  const handleInspiration = (inspiration: string) => {
    console.log('🔄 Inspiration selected:', inspiration);
    setStep(11); // Advance immediately
    saveToSupabase({ referral_source: inspiration }); // Save in background
  };

  const handleMainGoal = (goal: string) => {
    console.log('🔄 Main goal selected:', goal);
    setStep(12); // Advance immediately
    saveToSupabase({ main_goal: goal }); // Save in background
  };

  const handleImageUpload = () => {
    if (selectedImage) {
      console.log('🔄 Image uploaded');
      setStep(13); // Advance immediately
      saveToSupabase({ avatar_url: 'placeholder_image_url' }); // Save in background
    }
  };

  const handlePaywallComplete = async () => {
    try {
      console.log('[Auth] Starting paywall completion...');
      
      // 1. Save to Supabase first
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (error) {
        throw error;
      }
      
      console.log('[Auth] ✅ Onboarding completed in database');
      
      // 2. Force refetch onboarding status
      await refetchOnboardingStatus();
      console.log('[Auth] ✅ Onboarding status refetched');
      
      // 3. CRITICAL: Wait longer for state to propagate
      await new Promise(resolve => setTimeout(resolve, 500)); // Increased from 200ms
      
      // 4. Force check the state before navigation
      const { data: verifyProfile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();
      
      console.log('[Auth] 🔍 Verification check:', verifyProfile);
      
      if (verifyProfile?.onboarding_completed !== true) {
        console.error('[Auth] ❌ State not synced, retrying...');
        await refetchOnboardingStatus();
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // 5. Force a hard reload to dashboard to guarantee navigation
      console.log('[Auth] 🚨 Forcing hard reload to dashboard');
      window.location.href = '/dashboard';
      
    } catch (error) {
      console.error('[Auth] ❌ Error completing onboarding:', error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePaywallSkip = () => {
    navigate('/dashboard', { replace: true });
  };

  // Calculate progress (steps 1-12 are the main onboarding)
  const progress = Math.min((step / 12) * 100, 100);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const fakeResult = {
    overallScore: 83,
    imageUrl: imageUrl || '',
    breakdown: [
      { category: 'Aura', score: 98, emoji: '✨' },
      { category: 'Fit', score: 75, emoji: '🧥' },
      { category: 'Color', score: 80, emoji: '🎨' }
    ],
    summary: "Your style aura is off the charts! Fit and color are solid. Unlock the full breakdown by upgrading.",
    tips: [],
    rawAnalysis: "Demo analysis"
  };

  const isCapacitor = Capacitor?.isNativePlatform?.() || false;

  const handleTakePhoto = async () => {
    if (!isCapacitor) return;
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });
      if (photo?.dataUrl) {
        const res = await fetch(photo.dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'photo.jpg', { type: blob.type });
        setSelectedImage(file);
        setImageUrl(photo.dataUrl);
      }
    } catch (e) {
      alert('Camera error: ' + e);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImageUrl(URL.createObjectURL(file));
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      setResult({ ...fakeResult, imageUrl: imageUrl || URL.createObjectURL(selectedImage) });
      setShowResult(true);
      setIsAnalyzing(false);
      setTimeout(() => {
        requestInAppReview();
      }, 1000);
    }, 2200); // Simulate AI delay
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col">
      {/* Progress Bar - Only show during steps 1-12 */}
      {step <= 12 && (
        <div className="p-4">
          <Progress value={progress} className="w-full" />
          <p className="text-white/60 text-sm mt-2 text-center">
            Step {step} of 12
          </p>
        </div>
      )}

      {/* Step Content */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <NewWelcomeStep 
              key="welcome"
              onNext={() => setStep(2)} 
            />
          )}
          
          {step === 2 && (
            <ShoppingFrequencyStep 
              key="shopping"
              onSelect={handleShoppingFrequency} 
            />
          )}
          
          {step === 3 && (
            <BudgetRangeStep 
              key="budget"
              onSelect={handleBudgetRange} 
            />
          )}
          
          {step === 4 && (
            <StylePreferencesStep 
              key="styles"
              onNext={handleStylePreferences} 
            />
          )}
          
          {step === 5 && (
            <BodyTypeStep 
              key="body"
              onSelect={handleBodyType} 
            />
          )}
          
          {step === 6 && (
            <FitPreferenceStep 
              key="fit"
              onSelect={handleFitPreference} 
            />
          )}
          
          {step === 7 && (
            <ColorPaletteStep 
              key="colors"
              onNext={handleColorPalette} 
            />
          )}
          
          {step === 8 && (
            <ShoeSizeStep 
              key="shoe"
              onNext={handleShoeSize} 
            />
          )}
          
          {step === 9 && (
            <BrandAffinityStep 
              key="brands"
              onNext={handleBrandAffinity} 
            />
          )}
          
          {step === 10 && (
            <InspirationLinkStep 
              key="inspiration"
              onNext={handleInspiration} 
            />
          )}
          
          {step === 11 && (
            <MainGoalStep 
              key="goal"
              onSelect={handleMainGoal} 
            />
          )}
          
          {step === 12 && (
            <motion.div key="test-photo" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.6, ease: "easeOut" }} className="h-full flex flex-col">
              {isAnalyzing && (
                <StyleLoadingOverlay isAnalyzing={true} />
              )}
              {!showResult ? (
                <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
                  <motion.div animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="mb-8">
                    <Sparkles className="w-16 h-16 text-orange-400 mx-auto" />
                  </motion.div>
                  <div className="space-y-4 text-center mb-8">
                    <h2 className="text-4xl font-bold text-white">Let's test it out!</h2>
                    <p className="text-white/70 text-xl leading-relaxed max-w-sm">Upload or take a photo to get your first style rating</p>
                  </div>
                  <div className="w-full max-w-sm mb-8">
                    {!selectedImage ? (
                      <div className="border-2 border-dashed border-white/30 rounded-2xl p-8 text-center bg-white/5">
                        <Camera className="w-12 h-12 text-white/50 mx-auto mb-4" />
                        <p className="text-white/70 mb-4">Choose a photo</p>
                        <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" id="photo-upload" />
                        <label htmlFor="photo-upload" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl cursor-pointer transition-all duration-300">
                          <Upload className="w-4 h-4" />Select Photo
                        </label>
                        {isCapacitor && (
                          <Button onClick={handleTakePhoto} className="w-full mt-4 bg-orange-500 text-white">Take Photo</Button>
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                        <img src={imageUrl || URL.createObjectURL(selectedImage)} alt="Selected" className="w-full h-64 object-cover rounded-2xl" />
                        <button onClick={() => { setSelectedImage(null); setImageUrl(null); }} className="absolute top-2 right-2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors">×</button>
                      </div>
                    )}
                  </div>
                  {selectedImage && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="px-8 pb-8">
                      <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl disabled:opacity-50">
                        {isAnalyzing ? (<div className="flex items-center gap-2"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing...</div>) : (<><Sparkles className="mr-3 h-5 w-5" />Get My Style Rating</>)}
                      </Button>
                    </motion.div>
                  )}
                </div>
              ) : (
                <motion.div key="result" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.6, ease: "easeOut" }} className="h-full flex flex-col items-center justify-center px-8 py-12">
                  <ModernRatingsDisplay
                    overallScore={result.overallScore}
                    profileImage={result.imageUrl}
                    breakdown={result.breakdown}
                    isOnboarding={true}
                  />
                  <div className="text-white/80 mb-4 mt-6">You're better than <span className="text-orange-400 font-bold">70%</span> of users!</div>
                  <div className="text-white/60 mb-8 max-w-md mx-auto">{result.summary}</div>
                  <Button onClick={() => setStep(13)} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-14 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl">Continue</Button>
                </motion.div>
              )}
            </motion.div>
          )}
          
          {step === 13 && (
            <CelebrationNewStep 
              key="celebration"
              onNext={() => setStep(14)} 
            />
          )}
          
          {step === 14 && (
            <ProOfferCard 
              key="paywall"
              onContinue={handlePaywallComplete}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export const Auth = AuthOnboardingWizard;
export default Auth;
