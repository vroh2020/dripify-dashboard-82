import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import { SubscriptionProvider } from "./components/subscription/SubscriptionProvider";
import { AuthErrorBoundary } from "./components/auth/AuthErrorBoundary";
import { useAuth } from "./hooks/useAuth";
import { useOnboardingStatus } from "./hooks/useOnboardingStatus";
import { useAppUrlHandler } from "./hooks/useAppUrlHandler";
import { LoadingScreen } from "./components/LoadingScreen";


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
  // CRITICAL FIX: All hooks must be called at the top, in the same order every time
  const { isLoading: authLoading, isAuthenticated, user, error: authError } = useAuth();
  const { isLoading: onboardingLoading, hasCompletedOnboarding, retryCount } = useOnboardingStatus();
  const [hasTimedOut, setHasTimedOut] = useState(false);
  
  // Handle deep link auth callbacks
  useAppUrlHandler();

  // Enhanced timeout protection
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (authLoading || onboardingLoading) {
        console.warn('⚠️ App routing timeout - showing fallback');
        setHasTimedOut(true);
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(timeout);
  }, [authLoading, onboardingLoading]);

  // Reset timeout when loading states change
  useEffect(() => {
    if (!authLoading && !onboardingLoading) {
      setHasTimedOut(false);
    }
  }, [authLoading, onboardingLoading]);

  // Enhanced loading logic with better messaging
  if ((authLoading || onboardingLoading) && !hasTimedOut) {
    let message = "Loading...";
    
    if (authLoading) {
      message = "Authenticating...";
    } else if (onboardingLoading) {
      if (retryCount > 0) {
        message = `Loading progress... (attempt ${retryCount + 1})`;
      } else {
        message = "Checking your progress...";
      }
    }
    
    return <LoadingScreen message={message} />;
  }

  // Timeout fallback with recovery options
  if (hasTimedOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center text-white space-y-6 max-w-md">
          <h2 className="text-2xl font-bold">Loading Taking Too Long?</h2>
          <p className="text-white/70">
            Something seems to be taking longer than expected. Let's try a fresh start.
          </p>
          
          {authError && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
              <p className="text-red-300 text-sm">{authError}</p>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Refresh App
            </button>
            
            <button
              onClick={() => {
                setHasTimedOut(false);
                // Force re-check
                window.location.href = '/auth';
              }}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-xl transition-colors"
            >
              Start Over
            </button>
          </div>
          
          <p className="text-xs text-white/50">
            If this keeps happening, email support@dripmax.com
          </p>
        </div>
      </div>
    );
  }

  // SIMPLIFIED: Removed the useRef that was causing hooks violation
  console.log('🔍 App Routing Decision:', {
    isAuthenticated,
    hasCompletedOnboarding,
    user: !!user,
    authError,
    retryCount
  });

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      
      {/* Protected dashboard routes - strict validation */}
      {isAuthenticated && user && hasCompletedOnboarding && (
        <>
          <Route path="/dashboard" element={<Index />} />
          <Route path="/scan" element={<Index />} />
          <Route path="/tips" element={<Index />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/" element={<Index />} />
          <Route path="*" element={<Index />} />
        </>
      )}
      

      
      {/* Enhanced fallback routing */}
      <Route path="*" element={
        <Auth key={`auth-${Date.now()}`} />
      } />
    </Routes>
  );
};

const App = () => {
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
