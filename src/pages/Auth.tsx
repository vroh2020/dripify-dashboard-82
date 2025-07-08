import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ModernOnboarding } from "@/components/onboarding/ModernOnboarding";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { LoadingScreen } from "@/components/LoadingScreen";

export const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { isLoading: onboardingLoading, hasCompletedOnboarding } = useOnboardingStatus();

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

  if (authLoading || onboardingLoading) {
    return <LoadingScreen message="Checking your status..." />;
  }

  return <ModernOnboarding onComplete={handleComplete} />;
};

export default Auth;
