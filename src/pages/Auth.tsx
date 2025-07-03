import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ModernOnboarding } from "@/components/onboarding/ModernOnboarding";
import { useToast } from "@/hooks/use-toast";
import { useAuthState } from "@/hooks/useAuthState";
import { LoadingScreen } from "@/components/LoadingScreen";
import type { OnboardingData } from "@/components/onboarding/types";

export const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isLoading } = useAuthState();

  // Handle OAuth errors
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

  // FIXED: Handle complete user data from onboarding
  const handleComplete = (userData: OnboardingData) => {
    console.log('✅ Onboarding completed with user data:', {
      age: userData.age,
      mainGoal: userData.mainGoal,
      hasAnalysis: !!userData.analysisResult
    });
    navigate("/dashboard", { replace: true });
  };

  if (isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  return <ModernOnboarding onComplete={handleComplete} />;
};

export default Auth;
