
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ProOfferCard } from './ProOfferCard';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingFlowProps {
  onComplete: () => void;
}

// Define the steps in our onboarding process
type OnboardingStep = 'welcome' | 'style-preferences' | 'body-type' | 'pro-offer' | 'complete';

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [preferences, setPreferences] = useState({
    stylePreference: '',
    bodyType: ''
  });

  const handleNext = () => {
    switch (currentStep) {
      case 'welcome':
        setCurrentStep('style-preferences');
        break;
      case 'style-preferences':
        setCurrentStep('body-type');
        break;
      case 'body-type':
        setCurrentStep('pro-offer');
        break;
      case 'pro-offer':
        setCurrentStep('complete');
        savePreferences();
        onComplete();
        break;
      case 'complete':
        onComplete();
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'style-preferences':
        setCurrentStep('welcome');
        break;
      case 'body-type':
        setCurrentStep('style-preferences');
        break;
      case 'pro-offer':
        setCurrentStep('body-type');
        break;
    }
  };

  const handleStylePreferenceSelect = (preference: string) => {
    setPreferences({
      ...preferences,
      stylePreference: preference
    });
  };

  const handleBodyTypeSelect = (bodyType: string) => {
    setPreferences({
      ...preferences,
      bodyType
    });
  };

  const savePreferences = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await supabase
          .from('profiles')
          .update({
            style_preference: preferences.stylePreference,
            body_type: preferences.bodyType,
          })
          .eq('id', data.user.id);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md mx-auto"
      >
        {currentStep === 'welcome' && (
          <Card className="bg-black/20 backdrop-blur-lg border-white/10">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-white mb-4">Welcome to Gen Style!</h2>
              <p className="text-white/70 mb-6">
                Let's personalize your experience and help you look your best.
                We'll ask a few questions to understand your style preferences.
              </p>
              <Button 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                onClick={handleNext}
              >
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 'style-preferences' && (
          <Card className="bg-black/20 backdrop-blur-lg border-white/10">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">What's your style preference?</h2>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {['Casual', 'Formal', 'Streetwear', 'Minimalist', 'Vintage', 'Athletic'].map((style) => (
                  <Button
                    key={style}
                    variant={preferences.stylePreference === style ? "default" : "outline"}
                    className={`border border-white/20 ${preferences.stylePreference === style ? 'bg-purple-500 hover:bg-purple-600' : 'bg-black/30 hover:bg-black/40'}`}
                    onClick={() => handleStylePreferenceSelect(style)}
                  >
                    {style}
                  </Button>
                ))}
              </div>
              <div className="flex justify-between">
                <Button 
                  variant="ghost" 
                  onClick={handleBack}
                  className="text-white/70 hover:text-white"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={handleNext}
                  disabled={!preferences.stylePreference}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                >
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'body-type' && (
          <Card className="bg-black/20 backdrop-blur-lg border-white/10">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">What's your body type?</h2>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {['Slim', 'Athletic', 'Average', 'Muscular', 'Curvy', 'Plus-size'].map((bodyType) => (
                  <Button
                    key={bodyType}
                    variant={preferences.bodyType === bodyType ? "default" : "outline"}
                    className={`border border-white/20 ${preferences.bodyType === bodyType ? 'bg-purple-500 hover:bg-purple-600' : 'bg-black/30 hover:bg-black/40'}`}
                    onClick={() => handleBodyTypeSelect(bodyType)}
                  >
                    {bodyType}
                  </Button>
                ))}
              </div>
              <div className="flex justify-between">
                <Button 
                  variant="ghost" 
                  onClick={handleBack}
                  className="text-white/70 hover:text-white"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={handleNext}
                  disabled={!preferences.bodyType}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                >
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'pro-offer' && (
          <ProOfferCard onContinue={handleNext} />
        )}
      </motion.div>
    </AnimatePresence>
  );
};
