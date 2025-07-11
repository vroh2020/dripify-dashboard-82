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

  // Handle deep link auth callbacks
  useAppUrlHandler();

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
