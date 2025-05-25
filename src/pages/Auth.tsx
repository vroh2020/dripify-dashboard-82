import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ModernOnboarding } from "@/components/onboarding/ModernOnboarding";

export const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // User is already authenticated, go to main app
        navigate("/");
      }
    });
  }, [navigate]);

  const handleOnboardingComplete = (userData: any) => {
    console.log('Onboarding completed with data:', userData);
    
    toast({
      title: "Welcome to Drip Max!",
      description: "Your account has been created successfully.",
    });
    
    // Navigate to main app immediately - let Index.tsx handle auth checking
    navigate("/");
  };

  // Always show onboarding - no more sign in/sign up form!
  return <ModernOnboarding onComplete={handleOnboardingComplete} />;
};

export default Auth;
