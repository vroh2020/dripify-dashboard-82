
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
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Handle pending onboarding data after auth
  usePendingOnboarding();

  useEffect(() => {
    let isMounted = true;

    const handleAuthStateChange = async () => {
      try {
        // First check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (isMounted) {
            setIsCheckingAuth(false);
          }
          return;
        }

        if (session && isMounted) {
          console.log('Found existing session, redirecting to dashboard');
          navigate("/dashboard");
          return;
        }

        if (isMounted) {
          setIsCheckingAuth(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session ? 'session exists' : 'no session');
      
      if (event === 'SIGNED_IN' && session && isMounted) {
        console.log('User signed in, redirecting to dashboard');
        navigate("/dashboard");
      } else if (event === 'SIGNED_OUT' && isMounted) {
        setIsCheckingAuth(false);
      }
    });

    // Check initial auth state
    handleAuthStateChange();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
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

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] via-[#2C1F3D] to-[#1A1F2C] flex items-center justify-center">
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-white text-lg font-medium"
        >
          Checking authentication...
        </motion.div>
      </div>
    );
  }

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
