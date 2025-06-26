import { useEffect, useMemo, useRef, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ModernOnboarding } from "@/components/onboarding/ModernOnboarding";
import { usePendingOnboarding } from "@/hooks/usePendingOnboarding";
import { useToast } from "@/hooks/use-toast";
import { useAuthState } from "@/hooks/useAuthState";
import { LoadingScreen } from "@/components/LoadingScreen";

export const Auth = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isLoading, isAuthenticated } = useAuthState();

  // Debug logging (only when state actually changes)
  const debugInfo = useMemo(() => ({ isAuthenticated }), [isAuthenticated]);
  const prevDebugRef = useRef<any>();
  
  if (JSON.stringify(prevDebugRef.current) !== JSON.stringify(debugInfo)) {
    console.log('🔍 Auth component state changed:', debugInfo);
    prevDebugRef.current = debugInfo;
  }
  
  // Handle pending onboarding data after auth
  usePendingOnboarding();

  // Handle OAuth callbacks and errors
  useEffect(() => {
    const urlHash = window.location.hash;
    const urlParams = new URLSearchParams(location.search);
    
    // Handle OAuth errors
    const authError = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    
    if (authError) {
      console.error('🍎 OAuth error:', authError, errorDescription);
      toast({
        title: "Authentication Error",
        description: errorDescription || "Apple Sign In failed. Please try again.",
        variant: "destructive",
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Clear hash after processing
    if (urlHash && urlHash.includes('access_token')) {
      setTimeout(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 1000);
    }
  }, [location.search, toast]);

  const handleOnboardingComplete = (userData: any) => {
    console.log('🎯 Onboarding completed, navigating to dashboard');
    navigate("/dashboard", { replace: true });
  };

  // Show loading while checking authentication
  if (isLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // Always show onboarding - it handles auth state internally
  return <ModernOnboarding onComplete={handleOnboardingComplete} />;
});

export default Auth;
