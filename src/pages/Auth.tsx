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

  // REMOVED: The navigation logic that was conflicting with App.tsx routing
  // The main App.tsx now handles all routing decisions properly

  const handleComplete = () => {
    navigate("/dashboard", { replace: true });
  };

  // Show loading while auth/onboarding status is being determined
  if (authLoading || onboardingLoading) {
    return <LoadingScreen message="Checking your status..." />;
  }

  // If user is authenticated and has completed onboarding, let App.tsx handle the redirect
  if (isAuthenticated && hasCompletedOnboarding) {
    return <LoadingScreen message="Redirecting to dashboard..." />;
  }

  return <ModernOnboarding onComplete={handleComplete} />;
};

export default Auth;
