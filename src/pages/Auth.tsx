
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { ModernOnboarding } from "@/components/onboarding/ModernOnboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { AuthForm } from "@/components/auth/AuthForm";
import { usePendingOnboarding } from "@/hooks/usePendingOnboarding";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from '@capacitor/core';

export const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { toast } = useToast();
  
  // Handle pending onboarding data after auth
  usePendingOnboarding();

  useEffect(() => {
    let isMounted = true;
    let authTimeout: NodeJS.Timeout;
    
    console.log('Auth page loaded, current URL:', window.location.href);
    console.log('URL search params:', location.search);
    console.log('URL hash:', window.location.hash);
    console.log('Platform:', Capacitor.isNativePlatform() ? 'Mobile' : 'Web');

    const handleAuthStateChange = async () => {
      try {
        // Set a timeout to prevent infinite loading
        authTimeout = setTimeout(() => {
          if (isMounted) {
            console.log('Auth check timeout, stopping loading state');
            setIsCheckingAuth(false);
          }
        }, 8000);

        // Check for auth tokens in URL hash first (OAuth callback)
        const urlHash = window.location.hash;
        const urlParams = new URLSearchParams(location.search);
        
        if (urlHash && (urlHash.includes('access_token') || urlHash.includes('code='))) {
          console.log('Auth tokens found in URL, processing OAuth callback...');
          // Let Supabase handle the OAuth callback
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error processing OAuth callback:', error);
          } else if (data.session) {
            console.log('OAuth session established successfully');
            clearTimeout(authTimeout);
            // Clear the hash from URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            if (isMounted) {
              toast({
                title: "Welcome!",
                description: "You've successfully signed in with Google.",
              });
              setTimeout(() => {
                navigate("/dashboard", { replace: true });
              }, 100);
            }
            return;
          }
        }

        // Check for OAuth error parameters
        const authError = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        if (authError && isMounted) {
          console.error('OAuth error:', authError, errorDescription);
          clearTimeout(authTimeout);
          toast({
            title: "Authentication Error",
            description: errorDescription || "Authentication failed. Please try again.",
            variant: "destructive",
          });
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
          setIsCheckingAuth(false);
          return;
        }

        // Check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (isMounted) {
            clearTimeout(authTimeout);
            setIsCheckingAuth(false);
          }
          return;
        }

        if (session && isMounted) {
          console.log('Found existing session, redirecting to dashboard');
          clearTimeout(authTimeout);
          setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 100);
          return;
        }

        if (isMounted) {
          clearTimeout(authTimeout);
          setIsCheckingAuth(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        if (isMounted) {
          clearTimeout(authTimeout);
          setIsCheckingAuth(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session ? 'session exists' : 'no session');
      
      if (event === 'SIGNED_IN' && session && isMounted) {
        console.log('User signed in via auth state change, redirecting to dashboard');
        clearTimeout(authTimeout);
        toast({
          title: "Welcome!",
          description: "You've successfully signed in.",
        });
        setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 100);
      } else if (event === 'SIGNED_OUT' && isMounted) {
        clearTimeout(authTimeout);
        setIsCheckingAuth(false);
      }
    });

    handleAuthStateChange();

    return () => {
      isMounted = false;
      if (authTimeout) {
        clearTimeout(authTimeout);
      }
      subscription.unsubscribe();
    };
  }, [navigate, location.search, location.hash, toast]);

  const handleOnboardingComplete = (userData: any) => {
    if (userData.requiresAuth) {
      // User needs to authenticate first
      setIsOnboarding(false);
    } else {
      // Onboarding completed with authenticated user
      navigate("/dashboard", { replace: true });
    }
  };

  const handleAuthSuccess = () => {
    navigate("/dashboard", { replace: true });
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
