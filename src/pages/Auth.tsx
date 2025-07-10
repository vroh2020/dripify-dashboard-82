import { useEffect, useState } from "react";
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
  
  // Add timeout protection
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);

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

  // Handle redirect logic with timeout protection
  useEffect(() => {
    if (redirectAttempted) return; // Prevent multiple redirect attempts

    const handleRedirect = () => {
      if (isAuthenticated && hasCompletedOnboarding) {
        console.log('✅ Auth: User authenticated and onboarding completed, redirecting to dashboard');
        setRedirectAttempted(true);
        navigate("/dashboard", { replace: true });
      }
    };

    // If we have all the data we need, redirect immediately
    if (!authLoading && !onboardingLoading) {
      handleRedirect();
    }

    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (!redirectAttempted) {
        console.warn('⚠️ Auth: Redirect timeout reached');
        setIsTimedOut(true);
        setRedirectAttempted(true);
        // Force redirect to dashboard if authenticated, otherwise stay on auth
        if (isAuthenticated) {
          navigate("/dashboard", { replace: true });
        }
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, [isAuthenticated, hasCompletedOnboarding, authLoading, onboardingLoading, navigate, redirectAttempted]);

  const handleComplete = () => {
    console.log('✅ Auth: Onboarding completed, redirecting to dashboard');
    navigate("/dashboard", { replace: true });
  };

  // Show loading while auth/onboarding status is being determined
  if ((authLoading || onboardingLoading) && !isTimedOut) {
    return <LoadingScreen message="Checking your status..." />;
  }

  // If user is authenticated and has completed onboarding, show redirect message
  if (isAuthenticated && hasCompletedOnboarding && !redirectAttempted) {
    return <LoadingScreen message="Redirecting to dashboard..." />;
  }

  return <ModernOnboarding onComplete={handleComplete} />;
};

export default Auth;
