import { useEffect, useState, useRef } from "react";
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
  
  // CRITICAL FIX: Add stable state management
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const hasCheckedRedirect = useRef(false);
  const timeoutRef = useRef<number | null>(null);

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

  // CRITICAL FIX: Improved redirect logic with debouncing
  useEffect(() => {
    // Prevent multiple redirect attempts
    if (redirectAttempted || hasCheckedRedirect.current) return;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const shouldRedirect = isAuthenticated && hasCompletedOnboarding && !authLoading && !onboardingLoading;

    if (shouldRedirect) {
      console.log('✅ Auth: User authenticated and onboarding completed, redirecting to dashboard');
      setRedirectAttempted(true);
      hasCheckedRedirect.current = true;
      navigate("/dashboard", { replace: true });
      return;
    }

    // FIXED: Only set timeout if we're waiting for auth/onboarding data
    if (authLoading || onboardingLoading) {
      timeoutRef.current = setTimeout(() => {
        if (!redirectAttempted && !hasCheckedRedirect.current) {
          console.log('⚠️ Auth: Loading timeout reached, proceeding with current state');
          setIsTimedOut(true);
          hasCheckedRedirect.current = true;
          
          // Only redirect if clearly authenticated, otherwise stay in onboarding
          if (isAuthenticated && hasCompletedOnboarding) {
            setRedirectAttempted(true);
            navigate("/dashboard", { replace: true });
          }
        }
      }, 8000); // Increased timeout to 8 seconds and only runs once
    } else {
      // Data is loaded, mark as checked to prevent future timeouts
      hasCheckedRedirect.current = true;
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isAuthenticated, hasCompletedOnboarding, authLoading, onboardingLoading, navigate, redirectAttempted]);

  const handleComplete = () => {
    console.log('✅ Auth: Onboarding completed, redirecting to dashboard');
    setRedirectAttempted(true);
    navigate("/dashboard", { replace: true });
  };

  // FIXED: Improved loading conditions
  const shouldShowLoading = (authLoading || onboardingLoading) && !isTimedOut && !hasCheckedRedirect.current;
  const shouldShowRedirecting = isAuthenticated && hasCompletedOnboarding && !redirectAttempted && !hasCheckedRedirect.current;

  // Show loading while auth/onboarding status is being determined
  if (shouldShowLoading) {
    return <LoadingScreen message="Checking your status..." />;
  }

  // If user is authenticated and has completed onboarding, show redirect message
  if (shouldShowRedirecting) {
    return <LoadingScreen message="Redirecting to dashboard..." />;
  }

  // CRITICAL FIX: Always render ModernOnboarding to maintain state
  return <ModernOnboarding onComplete={handleComplete} />;
};

export default Auth;
