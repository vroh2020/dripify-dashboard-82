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
import { useOnboardingStatus } from "./hooks/useOnboardingStatus";
import { useAppUrlHandler } from "./hooks/useAppUrlHandler";
import { LoadingScreen } from "./components/LoadingScreen";
import "./utils/debugUtils"; // Import debug utilities

// Lazy load non-critical components
const Index = lazy(() => import("./pages/Index"));
const Profile = lazy(() => import("./pages/Profile"));

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
  const { isLoading: onboardingLoading, hasCompletedOnboarding, retryCount } = useOnboardingStatus();
  const routingDecisionRef = useRef({
    isAuthenticated: false,
    hasCompletedOnboarding: false,
    user: false,
    authError: null,
    retryCount: 0
  });

  // Add timeout protection to prevent infinite loading
  const [isTimedOut, setIsTimedOut] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  // Handle deep link auth callbacks
  useAppUrlHandler();

  // Calculate overall loading state with timeout protection
  const isOverallLoading = (authLoading || onboardingLoading) && !isTimedOut;

  // Timeout protection - prevent infinite loading states
  useEffect(() => {
    if (authLoading || onboardingLoading) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout - 10 seconds max
      timeoutRef.current = setTimeout(() => {
        console.warn('⚠️ Loading timeout reached - forcing navigation decision');
        setIsTimedOut(true);
      }, 10000);
    } else {
      // Clear timeout if not loading
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsTimedOut(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [authLoading, onboardingLoading]);

  // Log routing decisions only when they change
  useEffect(() => {
    const newDecision = {
      isAuthenticated,
      hasCompletedOnboarding,
      user: !!user,
      authError,
      retryCount
    };

    if (JSON.stringify(newDecision) !== JSON.stringify(routingDecisionRef.current)) {
      console.log('🔍 App Routing Decision:', newDecision);
      routingDecisionRef.current = newDecision;
    }
  }, [isAuthenticated, hasCompletedOnboarding, user, authError, retryCount]);

  // Memoize routes to prevent unnecessary re-renders
  const protectedRoutes = (
    <>
      <Route 
        path="/dashboard" 
        element={
          <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
            <Index />
          </Suspense>
        } 
      />
      <Route 
        path="/scan" 
        element={
          <Suspense fallback={<LoadingScreen message="Loading scanner..." />}>
            <Index />
          </Suspense>
        } 
      />
      <Route 
        path="/tips" 
        element={
          <Suspense fallback={<LoadingScreen message="Loading tips..." />}>
            <Index />
          </Suspense>
        } 
      />
      <Route 
        path="/profile" 
        element={
          <Suspense fallback={<LoadingScreen message="Loading profile..." />}>
            <Profile />
          </Suspense>
        } 
      />
    </>
  );

  // Show loading screen while determining routing (with timeout protection)
  if (isOverallLoading) {
    return <LoadingScreen message="Checking your status..." />;
  }

  // Handle authentication errors
  if (authError) {
    console.error('Auth error detected:', authError);
    return <Navigate to="/auth" replace />;
  }

  // Handle timeout case - force a decision
  if (isTimedOut) {
    console.warn('⚠️ Timeout reached - forcing navigation to auth');
    return <Navigate to="/auth" replace />;
  }

  return (
    <Routes>
      {/* Auth routes - always accessible */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/*" element={<Auth />} />
      <Route path="/sign-in" element={<Navigate to="/auth" replace />} />
      <Route path="/sign-out" element={<Navigate to="/auth" replace />} />
      
      {/* Protected dashboard routes */}
      {isAuthenticated && user ? (
        <>
          {/* Fully protected routes - require completed onboarding */}
          {hasCompletedOnboarding ? (
            <>
              {protectedRoutes}
              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              {/* Catch all other routes and redirect to dashboard */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </>
          ) : (
            <>
              {/* Allow onboarding routes */}
              <Route path="/onboarding" element={<Auth />} />
              <Route path="/onboarding/*" element={<Auth />} />
              {/* Redirect non-onboarding routes to onboarding */}
              <Route path="*" element={<Navigate to="/onboarding" replace />} />
            </>
          )}
        </>
      ) : (
        // Not authenticated - redirect everything to auth
        <Route path="*" element={<Navigate to="/auth" replace />} />
      )}
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
