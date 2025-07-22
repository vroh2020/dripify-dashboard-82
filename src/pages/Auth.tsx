import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ModernOnboarding } from "@/components/onboarding/ModernOnboarding";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { LoadingScreen } from "@/components/LoadingScreen";
import { handleAppleSignIn } from "@/components/onboarding/utils/auth";
import { Preferences } from '@capacitor/preferences';
import { supabase } from "@/integrations/supabase/client";

export const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { isLoading: onboardingLoading, hasCompletedOnboarding } = useOnboardingStatus();
  const [entryStep, setEntryStep] = useState<'choose' | 'onboarding'>('choose');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const authError = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    
    if (authError) {
      toast({
        title: "Sign In Failed",
        description: errorDescription || "Please try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, document.title, '/auth');
    }
  }, [location.search, toast]);

  useEffect(() => {
    if (!authLoading && !onboardingLoading) {
      if (isAuthenticated && hasCompletedOnboarding) {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [authLoading, onboardingLoading, isAuthenticated, hasCompletedOnboarding, navigate]);

  const handleComplete = () => {
    navigate("/dashboard", { replace: true });
  };

  const handleApple = async () => {
    setIsProcessing(true);
    const success = await handleAppleSignIn();
    setIsProcessing(false);
    if (success) {
      setEntryStep('onboarding');
    } else {
      toast({
        title: "Apple Sign In Failed",
        description: "Please try again or continue without Apple.",
        variant: "destructive",
      });
    }
  };

  const handleAnonymous = async () => {
    setIsProcessing(true);
    try {
      // Use Supabase's built-in anonymous sign-in
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      setEntryStep('onboarding');
    } catch (err) {
      toast({
        title: "Anonymous Sign In Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading || onboardingLoading || isProcessing) {
    return <LoadingScreen message="Checking your status..." />;
  }

  if (entryStep === 'choose' && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-blue-900 p-4">
        <div className="bg-black/60 rounded-2xl shadow-xl p-8 max-w-md w-full flex flex-col gap-6 items-center">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to Dripify AI</h1>
          <p className="text-gray-300 mb-4 text-center">Get started by choosing how you want to continue:</p>
          <button
            onClick={handleApple}
            className="w-full bg-white text-black font-semibold py-3 px-4 rounded-xl shadow hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            disabled={isProcessing}
          >
            <span role="img" aria-label="apple">🍎</span> Continue with Apple
          </button>
          <button
            onClick={handleAnonymous}
            className="w-full bg-gray-800 text-white font-semibold py-3 px-4 rounded-xl shadow hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            disabled={isProcessing}
          >
            <span role="img" aria-label="guest">👤</span> Continue without Apple
          </button>
        </div>
      </div>
    );
  }

  // After choosing, show onboarding
  return <ModernOnboarding onComplete={handleComplete} />;
};

export default Auth;
