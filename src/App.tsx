import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useRef, useEffect, useState, Suspense, lazy } from "react";
import Auth from "./pages/Auth";
import { SubscriptionProvider } from "./components/subscription/SubscriptionProvider";
import { AuthErrorBoundary } from "./components/auth/AuthErrorBoundary";
import { useAuth } from "./hooks/useAuth";
import { useAppUrlHandler } from "./hooks/useAppUrlHandler";
import { LoadingScreen } from "./components/LoadingScreen";
import { SimpleOnboarding } from "./components/onboarding/SimpleOnboarding";

// Lazy load non-critical components
const Index = lazy(() => {
  console.log('🎯 Loading Index component...');
  return import("./pages/Index").then(module => {
    console.log('🎯 Index component loaded successfully');
    return module;
  }).catch(error => {
    console.error('🎯 Error loading Index component:', error);
    throw error;
  });
});

const Profile = lazy(() => {
  console.log('🎯 Loading Profile component...');
  return import("./pages/Profile").then(module => {
    console.log('🎯 Profile component loaded successfully');
    return module;
  }).catch(error => {
    console.error('🎯 Error loading Profile component:', error);
    throw error;
  });
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const AppRoutes = () => {
  const { isLoading: authLoading, isAuthenticated, user, error: authError } = useAuth();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  // Handle deep link auth callbacks
  useAppUrlHandler();

  // Check onboarding status
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      setIsCheckingOnboarding(true);
      
      try {
        // Check localStorage first for immediate response
        const localOnboardingComplete = localStorage.getItem('onboarding_completed') === 'true';
        
        if (localOnboardingComplete) {
          setHasCompletedOnboarding(true);
          setIsCheckingOnboarding(false);
          return;
        }

        // If user is authenticated, check Supabase
        if (isAuthenticated && user?.id) {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', user.id)
            .maybeSingle();

          if (!error && profile?.onboarding_completed) {
            setHasCompletedOnboarding(true);
            localStorage.setItem('onboarding_completed', 'true');
          } else {
            setHasCompletedOnboarding(false);
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setHasCompletedOnboarding(false);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [isAuthenticated, user?.id]);

  // Add timeout protection for infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (authLoading || isCheckingOnboarding) {
        console.warn('⚠️ App loading timeout - forcing state resolution');
        console.log('Current state:', {
          authLoading,
          isCheckingOnboarding,
          isAuthenticated,
          hasCompletedOnboarding,
          user: !!user,
          currentPath: window.location.pathname
        });
        
        // Force resolution
        setIsCheckingOnboarding(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [authLoading, isCheckingOnboarding, isAuthenticated, hasCompletedOnboarding, user]);

  // Show loading while checking auth or onboarding
  if (authLoading || isCheckingOnboarding) {
    return <LoadingScreen message="Loading your style journey..." />;
  }

  // Show error state if auth failed
  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Error</h1>
          <p className="text-white/70 mb-6">{authError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  console.log('🔍 Current routing state:', {
    isAuthenticated,
    hasCompletedOnboarding,
    user: !!user,
    currentPath: window.location.pathname
  });

  return (
    <Routes>
      {/* Show onboarding if not completed */}
      {!hasCompletedOnboarding ? (
        <Route 
          path="/*" 
          element={
            <SimpleOnboarding 
              onComplete={() => {
                setHasCompletedOnboarding(true);
                localStorage.setItem('onboarding_completed', 'true');
                window.location.href = '/dashboard';
              }} 
            />
          } 
        />
      ) : (
        <>
          {/* Main app routes after onboarding */}
          <Route path="/dashboard" element={
            <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
              <Index />
            </Suspense>
          } />
          <Route path="/scan" element={
            <Suspense fallback={<LoadingScreen message="Loading scanner..." />}>
              <Index />
            </Suspense>
          } />
          <Route path="/tips" element={
            <Suspense fallback={<LoadingScreen message="Loading tips..." />}>
              <Index />
            </Suspense>
          } />
          <Route path="/profile" element={
            <Suspense fallback={<LoadingScreen message="Loading profile..." />}>
              <Profile />
            </Suspense>
          } />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/*" element={<Auth />} />
          <Route path="/sign-in" element={<Navigate to="/auth" replace />} />
          <Route path="/sign-out" element={<Navigate to="/auth" replace />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </>
      )}
    </Routes>
  );
};

const App = () => {
  // Add debug functions for development
  useEffect(() => {
    // Reset onboarding function
    (window as any).resetOnboarding = () => {
      console.log('🔄 Resetting onboarding state...');
      localStorage.removeItem('onboarding_completed');
      localStorage.removeItem('onboarding_data');
      window.location.reload();
    };

    // Force complete onboarding function
    (window as any).completeOnboarding = () => {
      console.log('✅ Force completing onboarding...');
      localStorage.setItem('onboarding_completed', 'true');
      window.location.href = '/dashboard';
    };

    // Debug current state
    (window as any).debugOnboarding = () => {
      console.log('🔍 Onboarding Debug Info:', {
        localStorageComplete: localStorage.getItem('onboarding_completed'),
        localStorageData: localStorage.getItem('onboarding_data'),
        currentPath: window.location.pathname,
        userAgent: navigator.userAgent
      });
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthErrorBoundary>
          <SubscriptionProvider>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
              }}
            >
              <AppRoutes />
            </BrowserRouter>
          </SubscriptionProvider>
        </AuthErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
