
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ModernOnboarding } from "@/components/onboarding/ModernOnboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { AuthForm } from "@/components/auth/AuthForm";
import { usePendingOnboarding } from "@/hooks/usePendingOnboarding";

export const Auth = () => {
  const navigate = useNavigate();
  const [isOnboarding, setIsOnboarding] = useState(true);
  
  // Handle pending onboarding data after auth
  usePendingOnboarding();

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleOnboardingComplete = (userData: any) => {
    if (userData.requiresAuth) {
      // User needs to authenticate first
      setIsOnboarding(false);
    } else {
      // Onboarding completed with authenticated user
      navigate("/dashboard");
    }
  };

  const handleAuthSuccess = () => {
    navigate("/dashboard");
  };

  if (isOnboarding) {
    return <ModernOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] via-[#2C1F3D] to-[#1A1F2C] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center gradient-text">Welcome to Drip Max</CardTitle>
            <CardDescription className="text-center text-white/70">
              Sign in to your account or create a new one to save your style preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm onSuccess={handleAuthSuccess} />
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() => setIsOnboarding(true)}
              className="text-white/70 hover:text-white"
            >
              Back to Onboarding
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
