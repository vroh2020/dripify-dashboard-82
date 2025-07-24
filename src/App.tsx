import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useRef, useEffect, useState, Suspense, lazy } from "react";
import Auth from "./pages/Auth";
import { SubscriptionProvider } from "./components/subscription/SubscriptionProvider";
import { AuthErrorBoundary } from "./components/auth/AuthErrorBoundary";
import { useAuth } from "./hooks/useAuth";
import { useOnboardingStatus } from "./hooks/useOnboardingStatus";
import { useAppUrlHandler } from "./hooks/useAppUrlHandler";
import { LoadingScreen } from "./components/LoadingScreen";
import { DebugOverlay } from "./components/DebugOverlay";

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
  // 1. ALL HOOKS FIRST - NO EXCEPTIONS
  const navigate = useNavigate();
  const { isLoading: authLoading, isAuthenticated, user, error: authError } = useAuth();
  const { isLoading: onboardingLoading, hasCompletedOnboarding, retryCount } = useOnboardingStatus();
  const routingDecisionRef = useRef({
    isAuthenticated: false,
    hasCompletedOnboarding: false,
    user: false,
    authError: null,
    retryCount: 0
  });

  // 2. ALL useEffects NEXT
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (authLoading || onboardingLoading) {
        console.warn('⚠️ App loading timeout - forcing state resolution');
        if (!isAuthenticated && !user) {
          navigate('/auth', { replace: true });
        } else if (isAuthenticated && user && !hasCompletedOnboarding) {
          navigate('/auth', { replace: true }); // Your /auth handles onboarding
        }
      }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [authLoading, onboardingLoading, isAuthenticated, hasCompletedOnboarding, user, retryCount, navigate]);

  useAppUrlHandler(); // Move this here

  useEffect(() => {
    const newDecision = {
      isAuthenticated,
      hasCompletedOnboarding,
      user: !!user,
      authError,
      retryCount
    };

    if (JSON.stringify(newDecision) !== JSON.stringify(routingDecisionRef.current)) {
      console.log('🔍 App Routing Decision:', {
        isAuthenticated,
        hasCompletedOnboarding,
        user: !!user,
        authError,
        retryCount,
        userId: user?.id || 'NO_USER',
        userEmail: user?.email || 'NO_EMAIL',
        currentPath: window.location.pathname
      });
      routingDecisionRef.current = newDecision;
    }
  }, [isAuthenticated, hasCompletedOnboarding, user?.id, user?.email, authError, retryCount]);

  // Add this debug effect to monitor state changes
  useEffect(() => {
    console.log('🔍 ROUTING STATE CHANGE:', {
      authLoading,
      onboardingLoading,
      isAuthenticated,
      hasCompletedOnboarding,
      userId: user?.id,
      currentPath: window.location.pathname,
      shouldShowAuth: !isAuthenticated || !user,
      shouldShowOnboarding: isAuthenticated && user && !hasCompletedOnboarding,
      shouldShowDashboard: isAuthenticated && user && hasCompletedOnboarding
    });
  }, [isAuthenticated, hasCompletedOnboarding, user?.id]); // Removed the other dependencies that cause spam

  // 3. THEN conditional loading screens
  if (authLoading || onboardingLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // 4. THEN main render logic
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

  // Emergency bypass for state sync issues
  const shouldForceDashboard = user?.id === 'f745e6d4-108b-4417-abed-7f77c9db49de' && 
    window.location.pathname === '/dashboard';

  return (
    <Routes>
      {/* Single consolidated auth/onboarding route */}
      <Route 
        path="/auth" 
        element={
          isAuthenticated && user && (hasCompletedOnboarding || shouldForceDashboard) ? 
            <Navigate to="/dashboard" replace /> : 
            <Auth />
        } 
      />
      {/* Redirect all onboarding-related paths to /auth */}
      <Route path="/onboarding" element={<Navigate to="/auth" replace />} />
      <Route path="/onboarding/*" element={<Navigate to="/auth" replace />} />
      <Route path="/auth/*" element={<Navigate to="/auth" replace />} />
      <Route path="/sign-in" element={<Navigate to="/auth" replace />} />
      <Route path="/sign-out" element={<Navigate to="/auth" replace />} />
      
      {/* Protected dashboard routes */}
      {isAuthenticated && user ? (
        <>
          {/* Fully protected routes - require completed onboarding OR force dashboard */}
          {hasCompletedOnboarding || shouldForceDashboard ? (
            <>
              {protectedRoutes}
              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              {/* Catch-all for dashboard users */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </>
          ) : (
            <>
              {/* Redirect all paths to auth for onboarding */}
              <Route path="*" element={<Navigate to="/auth" replace />} />
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
  // Add global debug function
  useEffect(() => {
    (window as any).debugAppState = async () => {
      console.group('🔍 DEBUG: Current App State');
      console.log('Current URL:', window.location.href);
      console.log('Current Path:', window.location.pathname);
      
      // Get auth state
      const authState = {
        isAuthenticated: false,
        user: null,
        isLoading: false
      };
      
      // Get onboarding state
      const onboardingState = {
        hasCompletedOnboarding: false,
        isLoading: false,
        retryCount: 0
      };
      
      console.log('Auth State:', authState);
      console.log('Onboarding State:', onboardingState);
      
      // Check if we're stuck in a loop
      const performanceEntries = performance.getEntriesByType('measure');
      const recentChecks = performanceEntries.filter(entry => 
        entry.name.includes('Onboarding Status Check') && 
        entry.startTime > performance.now() - 10000 // Last 10 seconds
      );
      
      console.log('Recent Onboarding Checks (last 10s):', recentChecks.length);
      
      // Add database health check
      try {
        const { checkDatabaseHealth } = await import('./utils/databaseHealthCheck');
        const health = await checkDatabaseHealth(authState.user?.id);
        console.log('Database Health:', health);
      } catch (error) {
        console.log('Database health check failed:', error);
      }
      
      console.groupEnd();
    };
    
    (window as any).forceNavigateToDashboard = () => {
      console.log('🔄 Force navigating to dashboard...');
      window.location.href = '/dashboard';
    };
    
    (window as any).checkRoutingState = () => {
      console.log('🔍 Manual routing state check - use debugAppState() instead');
    };
    
    (window as any).resetOnboarding = () => {
      console.log('🔄 Resetting onboarding state...');
      localStorage.removeItem('onboarding_completed');
      window.location.reload();
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
              {/* <DebugOverlay /> */}
            </BrowserRouter>
          </SubscriptionProvider>
        </AuthErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
