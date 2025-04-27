import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronRight, Check, AlertCircle } from "lucide-react";
import { getOfferings, purchasePackage, initializePurchases, PurchasesPackage, isRevenueCatAvailable } from "@/utils/revenueCat";

type OnboardingStep = "welcome" | "gender" | "referral" | "body" | "style" | "brands" | "pricing" | "auth" | "paywall";

export const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("auth");
  const [gender, setGender] = useState<string>("");
  const [referralSource, setReferralSource] = useState<string>("");
  const [bodyType, setBodyType] = useState<string>("");
  const [stylePreference, setStylePreference] = useState<string>("");
  const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);
  const [brandInput, setBrandInput] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<string>("free");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesPackage[]>([]);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(false);
  const [isWebEnvironment, setIsWebEnvironment] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const params = new URLSearchParams(window.location.search);
    const fromSignOut = params.get('from') === 'signout';
    
    if (fromSignOut) {
      setCurrentStep("auth");
      setIsSignUp(false);
    } else {
      setCurrentStep("welcome");
      setIsSignUp(true);
    }
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        if (!username.trim()) {
          throw new Error("Username is required");
        }
        if (username.length < 3) {
          throw new Error("Username must be at least 3 characters long");
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
              gender: gender,
              referral_source: referralSource,
              body_type: bodyType,
              style_preference: stylePreference,
              favorite_brands: favoriteBrands,
              plan: selectedPlan
            }
          }
        });
        
        if (signUpError) {
          if (signUpError.status === 429) {
            const errorBody = JSON.parse(signUpError.message.includes('{') ? 
              signUpError.message.substring(signUpError.message.indexOf('{')) : 
              '{"message": "Please wait a moment before trying again."}'
            );
            throw new Error(errorBody.message || "Please wait before trying again.");
          }
          throw signUpError;
        }

        toast({
          title: "Sign up successful!",
          description: "Please check your email to verify your account.",
          variant: "success",
        });
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
          variant: "success",
        });
        navigate("/");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setIsSubscribing(true);
    try {
      if (isWebEnvironment) {
        setTimeout(() => {
          toast({
            title: "Success",
            description: "Demo subscription activated. In the real app, this would process through the App Store or Google Play.",
            variant: "success",
          });
          setCurrentStep("auth");
        }, 1500);
        return;
      }
      
      const customerInfo = await purchasePackage(pkg);
      if (customerInfo) {
        toast({
          title: "Success",
          description: "Subscription purchased successfully!",
          variant: "success",
        });
        setCurrentStep("auth");
      }
    } catch (error) {
      console.error('Failed to purchase:', error);
      toast({
        title: "Error",
        description: "Failed to complete purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const addBrand = () => {
    if (brandInput.trim() && !favoriteBrands.includes(brandInput.trim())) {
      setFavoriteBrands([...favoriteBrands, brandInput.trim()]);
      setBrandInput("");
    }
  };

  const removeBrand = (brand: string) => {
    setFavoriteBrands(favoriteBrands.filter(b => b !== brand));
  };

  const nextStep = () => {
    if (currentStep === "welcome") setCurrentStep("gender");
    else if (currentStep === "gender" && gender) setCurrentStep("referral");
    else if (currentStep === "referral" && referralSource) setCurrentStep("body");
    else if (currentStep === "body" && bodyType) setCurrentStep("style");
    else if (currentStep === "style" && stylePreference) setCurrentStep("brands");
    else if (currentStep === "brands") setCurrentStep("pricing");
    else if (currentStep === "pricing") {
      if (selectedPlan === "premium") {
        setCurrentStep("paywall");
      } else {
        setCurrentStep("auth");
      }
    }
    else if (currentStep === "paywall") setCurrentStep("auth");
  };

  const prevStep = () => {
    if (currentStep === "gender") setCurrentStep("welcome");
    else if (currentStep === "referral") setCurrentStep("gender");
    else if (currentStep === "body") setCurrentStep("referral");
    else if (currentStep === "style") setCurrentStep("body");
    else if (currentStep === "brands") setCurrentStep("style");
    else if (currentStep === "pricing") setCurrentStep("brands");
    else if (currentStep === "paywall") setCurrentStep("pricing");
    else if (currentStep === "auth") {
      if (selectedPlan === "premium") {
        setCurrentStep("paywall");
      } else {
        setCurrentStep("pricing");
      }
    }
  };

  const renderWelcomeScreen = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center"
    >
      <div className="py-6 flex justify-center">
        <img 
          src="/lovable-uploads/346e5cd9-38d5-43b3-ac71-4abd6b546a1a.png" 
          alt="GenStyle Shirt" 
          className="w-40 h-40 object-contain"
        />
      </div>
      
      <h1 className="text-3xl font-bold bg-gradient-to-r from-[#F97316] to-[#FB923C] text-transparent bg-clip-text mb-4">
        Welcome to GenStyle
      </h1>
      
      <p className="text-white/70 mb-8">
        Your AI-powered personal stylist that helps you look your best.
      </p>
      
      <Button 
        onClick={nextStep} 
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
      >
        Get Started <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
      
      <div className="mt-6 text-sm text-white/50">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </div>
    </motion.div>
  );

  const renderGenderSelection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-xl font-semibold text-white mb-6 text-center">How do you identify?</h2>
      
      <RadioGroup value={gender} onValueChange={setGender} className="gap-3">
        <div className={`relative flex items-center rounded-md border ${gender === 'male' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setGender('male')}>
          <RadioGroupItem value="male" id="male" className="absolute right-4" />
          <Label htmlFor="male" className="flex-1 cursor-pointer text-white">Male</Label>
        </div>
        
        <div className={`relative flex items-center rounded-md border ${gender === 'female' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setGender('female')}>
          <RadioGroupItem value="female" id="female" className="absolute right-4" />
          <Label htmlFor="female" className="flex-1 cursor-pointer text-white">Female</Label>
        </div>
        
        <div className={`relative flex items-center rounded-md border ${gender === 'non-binary' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setGender('non-binary')}>
          <RadioGroupItem value="non-binary" id="non-binary" className="absolute right-4" />
          <Label htmlFor="non-binary" className="flex-1 cursor-pointer text-white">Non-binary</Label>
        </div>
        
        <div className={`relative flex items-center rounded-md border ${gender === 'prefer-not-to-say' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setGender('prefer-not-to-say')}>
          <RadioGroupItem value="prefer-not-to-say" id="prefer-not-to-say" className="absolute right-4" />
          <Label htmlFor="prefer-not-to-say" className="flex-1 cursor-pointer text-white">Prefer not to say</Label>
        </div>
      </RadioGroup>
      
      <div className="flex mt-8 gap-3">
        <Button variant="outline" onClick={prevStep} className="flex-1">
          Back
        </Button>
        <Button 
          onClick={nextStep} 
          disabled={!gender}
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );

  const renderReferralSource = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-xl font-semibold text-white mb-6 text-center">How did you find us?</h2>
      
      <RadioGroup value={referralSource} onValueChange={setReferralSource} className="gap-3">
        <div className={`relative flex items-center rounded-md border ${referralSource === 'instagram' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setReferralSource('instagram')}>
          <RadioGroupItem value="instagram" id="instagram" className="absolute right-4" />
          <Label htmlFor="instagram" className="flex-1 cursor-pointer text-white">Instagram</Label>
        </div>
        
        <div className={`relative flex items-center rounded-md border ${referralSource === 'x' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setReferralSource('x')}>
          <RadioGroupItem value="x" id="x" className="absolute right-4" />
          <Label htmlFor="x" className="flex-1 cursor-pointer text-white">X (Twitter)</Label>
        </div>
        
        <div className={`relative flex items-center rounded-md border ${referralSource === 'discord' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setReferralSource('discord')}>
          <RadioGroupItem value="discord" id="discord" className="absolute right-4" />
          <Label htmlFor="discord" className="flex-1 cursor-pointer text-white">Discord</Label>
        </div>
        
        <div className={`relative flex items-center rounded-md border ${referralSource === 'linkedin' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setReferralSource('linkedin')}>
          <RadioGroupItem value="linkedin" id="linkedin" className="absolute right-4" />
          <Label htmlFor="linkedin" className="flex-1 cursor-pointer text-white">LinkedIn</Label>
        </div>
        
        <div className={`relative flex items-center rounded-md border ${referralSource === 'other' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setReferralSource('other')}>
          <RadioGroupItem value="other" id="other" className="absolute right-4" />
          <Label htmlFor="other" className="flex-1 cursor-pointer text-white">Other</Label>
        </div>
      </RadioGroup>
      
      <div className="flex mt-8 gap-3">
        <Button variant="outline" onClick={prevStep} className="flex-1">
          Back
        </Button>
        <Button 
          onClick={nextStep} 
          disabled={!referralSource}
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );

  const renderBodyTypeSelection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-xl font-semibold text-white mb-6 text-center">What's your body type?</h2>
      
      <RadioGroup value={bodyType} onValueChange={setBodyType} className="gap-3">
        <div className={`relative flex items-center rounded-md border ${bodyType === 'athletic' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setBodyType('athletic')}>
          <RadioGroupItem value="athletic" id="athletic" className="absolute right-4" />
          <Label htmlFor="athletic" className="flex-1 cursor-pointer text-white">Athletic</Label>
        </div>
        
        <div className={`relative flex items-center rounded-md border ${bodyType === 'slim' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setBodyType('slim')}>
          <RadioGroupItem value="slim" id="slim" className="absolute right-4" />
          <Label htmlFor="slim" className="flex-1 cursor-pointer text-white">Slim</Label>
        </div>
        
        <div className={`relative flex items-center rounded-md border ${bodyType === 'average' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setBodyType('average')}>
          <RadioGroupItem value="average" id="average" className="absolute right-4" />
          <Label htmlFor="average" className="flex-1 cursor-pointer text-white">Average</Label>
        </div>
        
        <div className={`relative flex items-center rounded-md border ${bodyType === 'curvy' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setBodyType('curvy')}>
          <RadioGroupItem value="curvy" id="curvy" className="absolute right-4" />
          <Label htmlFor="curvy" className="flex-1 cursor-pointer text-white">Curvy</Label>
        </div>
        
        <div className={`relative flex items-center rounded-md border ${bodyType === 'plus-size' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setBodyType('plus-size')}>
          <RadioGroupItem value="plus-size" id="plus-size" className="absolute right-4" />
          <Label htmlFor="plus-size" className="flex-1 cursor-pointer text-white">Plus Size</Label>
        </div>
      </RadioGroup>
      
      <div className="flex mt-8 gap-3">
        <Button variant="outline" onClick={prevStep} className="flex-1">
          Back
        </Button>
        <Button 
          onClick={nextStep} 
          disabled={!bodyType}
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );

  const renderStylePreference = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-xl font-semibold text-white mb-6 text-center">What style do you prefer?</h2>
      
      <RadioGroup value={stylePreference} onValueChange={setStylePreference} className="gap-3">
        <div className={`relative flex items-center rounded-md border ${stylePreference === 'casual' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setStylePreference('casual')}>
          <RadioGroupItem value="casual" id="casual" className="absolute right-4" />
          <Label htmlFor="casual" className="flex-1 cursor-pointer text-white">Casual</Label>
        </div>
        
        <div className={`relative flex items-center rounded-md border ${stylePreference === 'business' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setStylePreference('business')}>
          <RadioGroupItem value="business" id="business" className="absolute right-4" />
          <Label htmlFor="business" className="flex-1 cursor-pointer text-white">Business</Label>
        </div>
        
        <div className={`relative flex items-center rounded-md border ${stylePreference === 'streetwear' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setStylePreference('streetwear')}>
          <RadioGroupItem value="streetwear" id="streetwear" className="absolute right-4" />
          <Label htmlFor="streetwear" className="flex-1 cursor-pointer text-white">Streetwear</Label>
        </div>
        
        <div className={`relative flex items-center rounded-md border ${stylePreference === 'vintage' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setStylePreference('vintage')}>
          <RadioGroupItem value="vintage" id="vintage" className="absolute right-4" />
          <Label htmlFor="vintage" className="flex-1 cursor-pointer text-white">Vintage</Label>
        </div>
        
        <div className={`relative flex items-center rounded-md border ${stylePreference === 'minimalist' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'} p-4 cursor-pointer`} onClick={() => setStylePreference('minimalist')}>
          <RadioGroupItem value="minimalist" id="minimalist" className="absolute right-4" />
          <Label htmlFor="minimalist" className="flex-1 cursor-pointer text-white">Minimalist</Label>
        </div>
      </RadioGroup>
      
      <div className="flex mt-8 gap-3">
        <Button variant="outline" onClick={prevStep} className="flex-1">
          Back
        </Button>
        <Button 
          onClick={nextStep} 
          disabled={!stylePreference}
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );

  const renderFavoriteBrands = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-xl font-semibold text-white mb-6 text-center">What are your favorite clothing brands?</h2>
      
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={brandInput}
            onChange={(e) => setBrandInput(e.target.value)}
            placeholder="Add a brand"
            className="bg-white/5 border-white/10 text-white"
          />
          <Button 
            onClick={addBrand}
            className="bg-purple-500 hover:bg-purple-600"
            type="button"
          >
            Add
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4">
          {favoriteBrands.map((brand, index) => (
            <div 
              key={index} 
              className="bg-purple-500/20 text-white px-3 py-1 rounded-full flex items-center gap-1"
            >
              {brand}
              <button 
                onClick={() => removeBrand(brand)}
                className="ml-1 text-white/70 hover:text-white"
                type="button"
              >
                ×
              </button>
            </div>
          ))}
          {favoriteBrands.length === 0 && (
            <p className="text-sm text-white/50">No brands added yet. Add your favorite brands above.</p>
          )}
        </div>
      </div>
      
      <div className="flex mt-8 gap-3">
        <Button variant="outline" onClick={prevStep} className="flex-1">
          Back
        </Button>
        <Button 
          onClick={nextStep} 
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );

  const renderPricingPlans = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-xl font-semibold text-white mb-6 text-center">Choose your plan</h2>
      
      <div className="space-y-4">
        <div 
          className={`relative rounded-lg border p-4 ${selectedPlan === 'free' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'}`}
          onClick={() => setSelectedPlan('free')}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-white">Free</h3>
              <p className="text-sm text-gray-400">Basic style analysis</p>
            </div>
            <p className="font-semibold text-white">$0</p>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center text-white">
              <Check className="mr-2 h-4 w-4 text-green-500" /> 3 style scans per month
            </li>
            <li className="flex items-center text-white">
              <Check className="mr-2 h-4 w-4 text-green-500" /> Basic style tips
            </li>
          </ul>
          {selectedPlan === 'free' && (
            <div className="absolute -top-2 -right-2 bg-purple-500 rounded-full p-1">
              <Check className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
        
        <div 
          className={`relative rounded-lg border p-4 ${selectedPlan === 'premium' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'}`}
          onClick={() => setSelectedPlan('premium')}
        >
          <div className="absolute -top-3 right-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-xs px-2 py-1 rounded-full">
            POPULAR
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-white">Premium</h3>
              <p className="text-sm text-gray-400">Advanced fashion analysis</p>
            </div>
            <div>
              <p className="font-semibold text-white">$4.99<span className="text-xs text-gray-400">/month</span></p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center text-white">
              <Check className="mr-2 h-4 w-4 text-green-500" /> Unlimited style scans
            </li>
            <li className="flex items-center text-white">
              <Check className="mr-2 h-4 w-4 text-green-500" /> Detailed analysis reports
            </li>
            <li className="flex items-center text-white">
              <Check className="mr-2 h-4 w-4 text-green-500" /> Personalized shopping tips
            </li>
          </ul>
          {selectedPlan === 'premium' && (
            <div className="absolute -top-2 -right-2 bg-purple-500 rounded-full p-1">
              <Check className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
      </div>
      
      <div className="flex mt-8 gap-3">
        <Button variant="outline" onClick={prevStep} className="flex-1">
          Back
        </Button>
        <Button 
          onClick={nextStep} 
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          {selectedPlan === 'free' ? 'Continue with Free' : 'Continue with Premium'}
        </Button>
      </div>
    </motion.div>
  );

  const renderPaywallScreen = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col space-y-6"
    >
      <h2 className="text-2xl font-bold text-white text-center mb-4">Choose Your Subscription</h2>
      
      {isWebEnvironment && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-md p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <p className="text-sm text-white/80">
              This is a demo of the subscription flow. In the actual mobile app, you would be redirected to the App Store or Google Play for payment processing.
            </p>
          </div>
        </div>
      )}
      
      {isLoadingOfferings ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : offerings.length > 0 ? (
        <div className="space-y-4">
          {offerings.map((pkg) => (
            <div 
              key={pkg.identifier}
              className="border border-purple-400/30 rounded-lg p-5 bg-purple-500/5 hover:bg-purple-500/10 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">{pkg.product.title}</h3>
                  <p className="text-gray-400 text-sm">{pkg.product.description}</p>
                  <p className="text-purple-300 font-bold mt-2">{pkg.product.priceString}</p>
                </div>
                <Button
                  onClick={() => handlePurchase(pkg)}
                  disabled={isSubscribing}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {isSubscribing ? "Processing..." : "Subscribe"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-white">
          <p>No subscription packages available at this time.</p>
          <p className="text-sm text-gray-400 mt-2">Please try again later or contact support.</p>
        </div>
      )}
      
      <div className="flex justify-center mt-4">
        <Button variant="outline" onClick={prevStep}>
          Back to Plans
        </Button>
      </div>
    </motion.div>
  );

  const renderAuthScreen = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-xl font-semibold text-white mb-6 text-center">
        {isSignUp ? "Create your account" : "Welcome back"}
      </h2>
      
      <form onSubmit={handleAuth} className="space-y-4">
        {isSignUp && (
          <div className="space-y-2">
            <Label htmlFor="username" className="text-white">Username</Label>
            <Input 
              id="username"
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="Choose a username"
            />
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white">Email</Label>
          <Input 
            id="email"
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white/5 border-white/10 text-white"
            placeholder="Enter your email"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password" className="text-white">Password</Label>
          <Input 
            id="password"
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white/5 border-white/10 text-white"
            placeholder="Enter your password"
            required
          />
        </div>
        
        <Button 
          type="submit" 
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          {loading ? "Processing..." : (isSignUp ? "Sign Up" : "Sign In")}
        </Button>
        
        <div className="text-center mt-4">
          <p className="text-white/70 text-sm">
            {isSignUp 
              ? "Already have an account? " 
              : "Don't have an account? "}
            <button 
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-purple-400 hover:underline"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>
      </form>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {currentStep === "welcome" && renderWelcomeScreen()}
      {currentStep === "gender" && renderGenderSelection()}
      {currentStep === "referral" && renderReferralSource()}
      {currentStep === "body" && renderBodyTypeSelection()}
      {currentStep === "style" && renderStylePreference()}
      {currentStep === "brands" && renderFavoriteBrands()}
      {currentStep === "pricing" && renderPricingPlans()}
      {currentStep === "paywall" && renderPaywallScreen()}
      {currentStep === "auth" && renderAuthScreen()}
    </AnimatePresence>
  );
};
