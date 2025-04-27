
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronRight, Check } from "lucide-react";

type OnboardingStep = "welcome" | "gender" | "referral" | "body" | "style" | "brands" | "auth";

export const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [gender, setGender] = useState<string>("");
  const [referralSource, setReferralSource] = useState<string>("");
  const [bodyType, setBodyType] = useState<string>("");
  const [stylePreference, setStylePreference] = useState<string>("");
  const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);
  const [brandInput, setBrandInput] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
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

        console.log("Onboarding data being saved:", {
          username,
          gender,
          referral_source: referralSource,
          body_type: bodyType,
          style_preference: stylePreference,
          favorite_brands: favoriteBrands
        });

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
              gender,
              referral_source: referralSource,
              body_type: bodyType,
              style_preference: stylePreference,
              favorite_brands: favoriteBrands
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

        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          console.log("User created, updating profile:", user.id);
          
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              gender,
              referral_source: referralSource,
              body_type: bodyType,
              style_preferences: [stylePreference],
              favorite_brands: favoriteBrands,
              onboarding_completed: true,
              onboarding_date: new Date().toISOString()
            })
            .eq('id', user.id);

          if (profileError) {
            console.error('Error updating profile:', profileError);
            toast({
              title: "Partial Success",
              description: "Account created, but some profile details could not be saved.",
              variant: "default"
            });
          } else {
            console.log("Profile updated successfully");
          }
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
    else if (currentStep === "brands") setCurrentStep("auth");
  };

  const prevStep = () => {
    if (currentStep === "gender") setCurrentStep("welcome");
    else if (currentStep === "referral") setCurrentStep("gender");
    else if (currentStep === "body") setCurrentStep("referral");
    else if (currentStep === "style") setCurrentStep("body");
    else if (currentStep === "brands") setCurrentStep("style");
    else if (currentStep === "auth") setCurrentStep("brands");
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

  const renderAuthScreen = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-xl font-semibold text-white mb-6 text-center">
        {isSignUp ? "Create your account" : "Sign in to your account"}
      </h2>
      
      <form onSubmit={handleAuth} className="space-y-4">
        {isSignUp && (
          <div className="space-y-2">
            <Label htmlFor="username" className="text-white">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
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
            required
            className="bg-white/5 border-white/10 text-white"
            placeholder="Enter your email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-white">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-white/5 border-white/10 text-white"
            placeholder="Choose a password"
          />
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={prevStep}
            variant="outline"
            className="flex-1"
          >
            Back
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                {isSignUp ? "Signing up..." : "Signing in..."}
              </div>
            ) : (
              <>{isSignUp ? "Sign up" : "Sign in"}</>
            )}
          </Button>
        </div>
        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-white/60 hover:text-white"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </form>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] to-[#2C1F3D] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="backdrop-blur-xl bg-black/30 border-white/10">
          <CardContent className="pt-6">
            <AnimatePresence mode="wait">
              {currentStep === "welcome" && renderWelcomeScreen()}
              {currentStep === "gender" && renderGenderSelection()}
              {currentStep === "referral" && renderReferralSource()}
              {currentStep === "body" && renderBodyTypeSelection()}
              {currentStep === "style" && renderStylePreference()}
              {currentStep === "brands" && renderFavoriteBrands()}
              {currentStep === "auth" && renderAuthScreen()}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
