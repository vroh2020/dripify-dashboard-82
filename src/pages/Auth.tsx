import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ModernOnboarding } from "@/components/onboarding/ModernOnboarding";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";

export const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isLoading } = useAuth();

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

  const handleComplete = () => {
    navigate("/dashboard", { replace: true });
  };

  if (isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  return <ModernOnboarding onComplete={handleComplete} />;
};

export default Auth;
