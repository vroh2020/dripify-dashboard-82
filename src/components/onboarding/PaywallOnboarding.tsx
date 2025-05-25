
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Apple, PartyPopper, Camera } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ImageUpload';
import { analyzeStyle } from '@/utils/imageAnalysis';
import { StyleLoadingOverlay } from '@/components/StyleLoadingOverlay';
import { DripScore } from '@/components/DripScore';
import { useToast } from '@/hooks/use-toast';
import { useRevenueCat } from '@/hooks/useRevenueCat';

interface PaywallOnboardingProps {
  onComplete: (userData: any) => void;
}

type OnboardingStep = 'app-preview' | 'age' | 'discovery' | 'goals' | 'intro-upload' | 'photo-test' | 'analyzing' | 'rating-result' | 'celebration' | 'free-trial-offer' | 'trial-reminder' | 'paywall';

export const PaywallOnboarding = ({ onComplete }: PaywallOnboardingProps) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('app-preview');
  const [userData, setUserData] = useState({
    age: '',
    discovery: '',
    goal: ''
  });
  const [testImage, setTestImage] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const { purchaseProduct, isLoading } = useRevenueCat();

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
        setCurrentStep('photo-test');
        break;
      case 'photo-test':
        if (testImage) {
          handleAnalyzePhoto();
        }
        break;
      case 'rating-result':
        setCurrentStep('celebration');
        break;
      case 'celebration':
        setCurrentStep('free-trial-offer');
        break;
      case 'free-trial-offer':
        setCurrentStep('trial-reminder');
        break;
      case 'trial-reminder':
        setCurrentStep('paywall');
        break;
      case 'paywall':
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
      case 'photo-test':
        setCurrentStep('intro-upload');
        break;
      case 'rating-result':
        setCurrentStep('photo-test');
        break;
    }
  };

  const handleAnalyzePhoto = async () => {
    if (!testImage) return;
    
    setIsAnalyzing(true);
    setCurrentStep('analyzing');
    
    try {
      const result = await analyzeStyle(testImage);
      setAnalysisResult(result);
      setCurrentStep('rating-result');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: "Please try again with a different photo.",
      });
      setCurrentStep('photo-test');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePurchase = async (productId: string) => {
    try {
      const success = await purchaseProduct(productId);
      if (success) {
        onComplete(userData);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Purchase failed",
        description: "Please try again.",
      });
    }
  };

  const getProgressWidth = () => {
    const steps = ['app-preview', 'age', 'discovery', 'goals', 'intro-upload', 'photo-test', 'rating-result', 'celebration', 'free-trial-offer', 'trial-reminder', 'paywall'];
    const currentIndex = steps.indexOf(currentStep);
    return `${(currentIndex / (steps.length - 1)) * 100}%`;
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
                {isAnalyzing && <StyleLoadingOverlay />}
                
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
                    
                    <Button 
                      onClick={handleNext}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                    >
                      Let's Get Started <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}

                {currentStep === 'age' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-full bg-gray-700 rounded-full h-1 mb-4">
                        <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-1 rounded-full" style={{ width: getProgressWidth() }}></div>
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
                        <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-1 rounded-full" style={{ width: getProgressWidth() }}></div>
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
                        <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-1 rounded-full" style={{ width: getProgressWidth() }}></div>
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
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-1 rounded-full" style={{ width: getProgressWidth() }}></div>
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
                      Test the App <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}

                {currentStep === 'photo-test' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-full bg-gray-700 rounded-full h-1 mb-4">
                        <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-1 rounded-full" style={{ width: getProgressWidth() }}></div>
                      </div>
                      <h2 className="text-xl font-semibold text-white">Take a photo and get your rating</h2>
                      <p className="text-white/60 text-sm mt-2">Upload a photo to test our AI analysis</p>
                    </div>
                    
                    <ImageUpload onImageSelect={setTestImage} />
                    
                    <div className="flex justify-between">
                      <Button variant="ghost" onClick={handleBack} className="text-white/70 hover:text-white">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <Button 
                        onClick={handleNext} 
                        disabled={!testImage}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                      >
                        Analyze Photo <Camera className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 'rating-result' && analysisResult && (
                  <div className="space-y-6 text-center">
                    <div className="w-full bg-gray-700 rounded-full h-1 mb-4">
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-1 rounded-full" style={{ width: getProgressWidth() }}></div>
                    </div>
                    
                    <h2 className="text-xl font-semibold text-white">Your Style Rating</h2>
                    
                    <DripScore score={analysisResult.overallScore} />
                    
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <p className="text-white/70 text-sm">
                        {analysisResult.summary || "Great style! Keep up the good work."}
                      </p>
                    </div>
                    
                    <Button 
                      onClick={handleNext}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                    >
                      Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}

                {currentStep === 'celebration' && (
                  <div className="space-y-6 text-center">
                    <div className="w-full bg-gray-700 rounded-full h-1 mb-4">
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-1 rounded-full" style={{ width: getProgressWidth() }}></div>
                    </div>
                    
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      className="text-8xl"
                    >
                      🎉
                    </motion.div>
                    
                    <div className="space-y-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <PartyPopper className="w-12 h-12 mx-auto text-orange-500 mb-2" />
                        <h2 className="text-xl font-semibold text-white">Awesome!</h2>
                        <p className="text-white/70">
                          You've experienced the power of Drip Max AI analysis
                        </p>
                      </motion.div>
                    </div>
                    
                    <Button 
                      onClick={handleNext}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                    >
                      Next <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}

                {currentStep === 'free-trial-offer' && (
                  <div className="space-y-6 text-center">
                    <div className="w-full bg-gray-700 rounded-full h-1 mb-4">
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-1 rounded-full" style={{ width: getProgressWidth() }}></div>
                    </div>
                    
                    <div className="space-y-4">
                      <h2 className="text-2xl font-semibold text-white">We offer</h2>
                      <div className="text-4xl font-bold text-orange-500">7 days free</div>
                      <p className="text-white/70">
                        so everyone can drip max with Drip Max.
                      </p>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <p className="text-white/60 text-sm">
                        Get unlimited outfit ratings, style tips, and AI recommendations
                      </p>
                    </div>
                    
                    <Button 
                      onClick={handleNext}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                    >
                      Try for Free <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}

                {currentStep === 'trial-reminder' && (
                  <div className="space-y-6 text-center">
                    <div className="w-full bg-gray-700 rounded-full h-1 mb-4">
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-1 rounded-full" style={{ width: getProgressWidth() }}></div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="text-6xl">🔔</div>
                      <h2 className="text-xl font-semibold text-white">You'll get a reminder</h2>
                      <div className="text-orange-500 font-semibold text-lg">2 days</div>
                      <p className="text-white/70">
                        before your trial ends.
                      </p>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <p className="text-white/60 text-sm">
                        Cancel anytime with no commitment
                      </p>
                    </div>
                    
                    <Button 
                      onClick={handleNext}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                    >
                      Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}

                {currentStep === 'paywall' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-full bg-gray-700 rounded-full h-1 mb-4">
                        <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-1 rounded-full w-full"></div>
                      </div>
                      <h2 className="text-xl font-semibold text-white">Choose Your Plan</h2>
                      <p className="text-white/60 text-sm mt-2">Start your free trial today</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-white/5 rounded-lg p-4 border border-orange-500/50">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-white font-semibold">Monthly</span>
                          <span className="text-orange-500 text-lg font-bold">$12.99/month</span>
                        </div>
                        <p className="text-white/60 text-sm mb-3">Perfect for getting started</p>
                        <Button 
                          onClick={() => handlePurchase('gs_1299_1m')}
                          disabled={isLoading}
                          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                        >
                          Start Monthly Plan
                        </Button>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-white font-semibold">Weekly</span>
                          <span className="text-white text-lg font-bold">$4.99/week</span>
                        </div>
                        <p className="text-white/60 text-sm mb-3">Try it out first</p>
                        <Button 
                          onClick={() => handlePurchase('gs_499_1w')}
                          disabled={isLoading}
                          variant="outline"
                          className="w-full border-white/20 text-white hover:bg-white/10"
                        >
                          Start Weekly Plan
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-white/50 text-xs">
                        ✓ No Payment Now • ✓ Cancel Anytime • ✓ 7 Days Free
                      </p>
                    </div>
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
