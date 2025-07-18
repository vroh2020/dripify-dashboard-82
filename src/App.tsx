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
import { useAppStateHandler } from "./hooks/useAppStateHandler";
import { LoadingScreen } from "./components/LoadingScreen";
import { DebugOverlay } from "./components/DebugOverlay";
import { CalOnboarding } from "./components/onboarding/CalOnboarding";
import { persistenceManager } from "./utils/persistenceManager";

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
  
  // Handle app state changes without causing refreshes
  useAppStateHandler();

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

  // Show loading screen while determining route
  if (authLoading || onboardingLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mb-4"></div>
        <p className="text-white/70">Loading your experience...</p>
      </div>
    );
  }

  // Add debugging for routing decisions
  console.log('🔍 Current routing state:', {
    isAuthenticated,
    hasCompletedOnboarding,
    user: !!user,
    currentPath: window.location.pathname,
    shouldShowDashboard: isAuthenticated && user && hasCompletedOnboarding,
    shouldShowOnboarding: isAuthenticated && user && !hasCompletedOnboarding
  });

  return (
    <Routes>
      {/* Auth routes - always accessible */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/*" element={<Auth />} />
      <Route path="/sign-in" element={<Navigate to="/auth" replace />} />
      <Route path="/sign-out" element={<Navigate to="/auth" replace />} />
      
      {/* Onboarding route - accessible if not completed */}
      {!hasCompletedOnboarding && (
        <Route path="/onboarding" element={<CalOnboarding onComplete={() => window.location.reload()} />} />
      )}
      
      {/* Main app routes - only accessible after onboarding */}
      {hasCompletedOnboarding ? (
        <>
          <Route path="/dashboard" element={<Index />} />
          <Route path="/scan" element={<Index />} />
          <Route path="/tips" element={<Index />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </>
      ) : (
        // Redirect to onboarding if not completed
        <Route path="/*" element={<Navigate to="/onboarding" replace />} />
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
      
      // Check persistence manager state
      const deviceInfo = persistenceManager.getDeviceInfo();
      console.log('Device Info:', deviceInfo);
      
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
    
    (window as any).forceOnboarding = () => {
      console.log('🔄 Force navigating to onboarding...');
      localStorage.removeItem('dripify_onboarding_completed');
      localStorage.removeItem('dripify_onboarding_progress');
      window.location.href = '/onboarding';
    };
    
    (window as any).forceDashboard = () => {
      console.log('🔄 Force navigating to dashboard...');
      localStorage.setItem('dripify_onboarding_completed', 'true');
      window.location.href = '/dashboard';
    };
    
    (window as any).forceNavigateToDashboard = () => {
      console.log('🔄 Force navigating to dashboard...');
      window.location.href = '/dashboard';
    };
    
    (window as any).checkRoutingState = () => {
      console.log('🔍 Manual routing state check - use debugAppState() instead');
    };
    
    (window as any).resetOnboarding = async () => {
      console.log('🔄 Resetting onboarding state...');
      await persistenceManager.clearOnboardingProgress();
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
