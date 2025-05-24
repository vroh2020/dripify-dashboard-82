
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Apple } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PaywallOnboardingProps {
  onComplete: (userData: any) => void;
}

type OnboardingStep = 'app-preview' | 'age' | 'discovery' | 'goals' | 'intro-upload' | 'complete';

export const PaywallOnboarding = ({ onComplete }: PaywallOnboardingProps) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('app-preview');
  const [userData, setUserData] = useState({
    age: '',
    discovery: '',
    goal: ''
  });
  const { toast } = useToast();

  const handleNext = () => {
    switch (currentStep) {
      case 'app-preview':
        setCurrentStep('age');
        break;
      case 'age':
        setCurrentStep('discovery');
        break;
      case 'discovery':
        setCurrentStep('goals');
        break;
      case 'goals':
        setCurrentStep('intro-upload');
        break;
      case 'intro-upload':
        setCurrentStep('complete');
        onComplete(userData);
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'age':
        setCurrentStep('app-preview');
        break;
      case 'discovery':
        setCurrentStep('age');
        break;
      case 'goals':
        setCurrentStep('discovery');
        break;
      case 'intro-upload':
        setCurrentStep('goals');
        break;
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const options = {
        clientId: 'com.genstyle.app',
        redirectURI: 'https://jjqwhxamjxsiotnhhqco.supabase.co/auth/v1/callback',
        scopes: 'email name',
        state: '12345',
        nonce: 'nonce',
      };

      const result = await SignInWithApple.authorize(options);
      
      if (result.response && result.response.identityToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: result.response.identityToken,
        });

        if (error) throw error;

        toast({
          title: "Sign in successful!",
          description: "Welcome to Drip Max!",
        });

        handleNext();
      }
    } catch (error) {
      console.error('Apple Sign In error:', error);
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: "Please try again or use email sign up.",
      });
    }
  };

  const handleEmailSignUp = () => {
    // Navigate to email signup
    handleNext();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] to-[#2C1F3D] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="backdrop-blur-xl bg-black/30 border-white/10">
              <CardContent className="p-6">
                {currentStep === 'app-preview' && (
                  <div className="text-center space-y-6">
                    <div className="py-6 flex justify-center">
                      <img 
                        src="/lovable-uploads/346e5cd9-38d5-43b3-ac71-4abd6b546a1a.png" 
                        alt="Drip Max App Preview" 
                        className="w-48 h-48 object-contain rounded-lg"
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <h1 className="text-2xl font-bold bg-gradient-to-r from-[#F97316] to-[#FB923C] text-transparent bg-clip-text">
                        Welcome to Drip Max
                      </h1>
                      <p className="text-white/70 text-sm">
                        Your AI-powered style assistant that helps you achieve maximum drip
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <Button 
                        onClick={handleAppleSignIn}
                        className="w-full bg-white text-black hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Apple className="h-5 w-5" />
                        Continue with Apple
                      </Button>
                      
                      <Button 
                        onClick={handleEmailSignUp}
                        variant="outline"
                        className="w-full border-white/20 text-white hover:bg-white/10"
                      >
                        Other options
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 'age' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-full bg-gray-700 rounded-full h-1 mb-4">
                        <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-1 rounded-full w-1/4"></div>
                      </div>
                      <h2 className="text-xl font-semibold text-white">How old are you?</h2>
                    </div>
                    
                    <RadioGroup value={userData.age} onValueChange={(value) => setUserData({...userData, age: value})}>
                      {['Under 24', '25-34', '35-44', '45-54', '55-64', '65+'].map((age) => (
                        <div key={age} className={`relative flex items-center rounded-md border ${userData.age === age ? 'border-orange-500 bg-orange-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setUserData({...userData, age})}>
                          <RadioGroupItem value={age} id={age} className="absolute right-4" />
                          <Label htmlFor={age} className="flex-1 cursor-pointer text-white">{age}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                    
                    <div className="flex justify-between">
                      <Button variant="ghost" onClick={handleBack} className="text-white/70 hover:text-white">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <Button 
                        onClick={handleNext} 
                        disabled={!userData.age}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                      >
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 'discovery' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-full bg-gray-700 rounded-full h-1 mb-4">
                        <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-1 rounded-full w-2/4"></div>
                      </div>
                      <h2 className="text-xl font-semibold text-white">Where did you hear about us?</h2>
                    </div>
                    
                    <RadioGroup value={userData.discovery} onValueChange={(value) => setUserData({...userData, discovery: value})}>
                      {['Google Search', 'TikTok', 'Searched on App Store', 'Instagram', 'Facebook', 'Through a friend', 'Other'].map((source) => (
                        <div key={source} className={`relative flex items-center rounded-md border ${userData.discovery === source ? 'border-orange-500 bg-orange-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setUserData({...userData, discovery: source})}>
                          <RadioGroupItem value={source} id={source} className="absolute right-4" />
                          <Label htmlFor={source} className="flex-1 cursor-pointer text-white">{source}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                    
                    <div className="flex justify-between">
                      <Button variant="ghost" onClick={handleBack} className="text-white/70 hover:text-white">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <Button 
                        onClick={handleNext} 
                        disabled={!userData.discovery}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                      >
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 'goals' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-full bg-gray-700 rounded-full h-1 mb-4">
                        <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-1 rounded-full w-3/4"></div>
                      </div>
                      <h2 className="text-xl font-semibold text-white">What is your main goal?</h2>
                      <p className="text-white/60 text-sm mt-2">I want to...</p>
                    </div>
                    
                    <RadioGroup value={userData.goal} onValueChange={(value) => setUserData({...userData, goal: value})}>
                      {[
                        { value: 'get-drippy', label: 'Get drippy', icon: '💧' },
                        { value: 'look-good', label: 'Find outfits that look good on me', icon: '✨' },
                        { value: 'dating', label: 'Trying to get a bf/gf', icon: '💕' },
                        { value: 'drip-max', label: 'Trying to drip max', icon: '🔥' }
                      ].map((goal) => (
                        <div key={goal.value} className={`relative flex items-center rounded-md border ${userData.goal === goal.value ? 'border-orange-500 bg-orange-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setUserData({...userData, goal: goal.value})}>
                          <span className="text-2xl mr-3">{goal.icon}</span>
                          <Label htmlFor={goal.value} className="flex-1 cursor-pointer text-white">{goal.label}</Label>
                          <RadioGroupItem value={goal.value} id={goal.value} className="absolute right-4" />
                        </div>
                      ))}
                    </RadioGroup>
                    
                    <div className="flex justify-between">
                      <Button variant="ghost" onClick={handleBack} className="text-white/70 hover:text-white">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <Button 
                        onClick={handleNext} 
                        disabled={!userData.goal}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                      >
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 'intro-upload' && (
                  <div className="space-y-6 text-center">
                    <div className="w-full bg-gray-700 rounded-full h-1 mb-4">
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-1 rounded-full w-full"></div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="text-6xl">🎯</div>
                      <h2 className="text-xl font-semibold text-white">We got you</h2>
                      <p className="text-white/70">
                        The first step is to upload a photo of yourself and see your outfit rating.
                      </p>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <p className="text-white/60 text-sm">
                        Get personalized style recommendations based on your photos and preferences
                      </p>
                    </div>
                    
                    <Button 
                      onClick={handleNext}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                    >
                      Let's Get Started <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
