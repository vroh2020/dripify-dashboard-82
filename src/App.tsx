import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useRef } from "react";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import { SubscriptionProvider } from "./components/subscription/SubscriptionProvider";
import { AuthErrorBoundary } from "./components/auth/AuthErrorBoundary";
import { useAuthState } from "./hooks/useAuthState";
import { useOnboardingStatus } from "./hooks/useOnboardingStatus";
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
  const { isLoading: authLoading, isAuthenticated } = useAuthState();
  const { isLoading: onboardingLoading, hasCompletedOnboarding } = useOnboardingStatus();

  // Debug logging (only when state actually changes)
  const prevStateRef = useRef<any>();
  const currentState = {
    authLoading,
    isAuthenticated,
    onboardingLoading,
    hasCompletedOnboarding,
    shouldShowOnboarding: isAuthenticated && !hasCompletedOnboarding
  };
  
  if (JSON.stringify(prevStateRef.current) !== JSON.stringify(currentState)) {
    console.log('🔍 AppRoutes State Change:', currentState);
    prevStateRef.current = currentState;
  }

  if (authLoading || (isAuthenticated && onboardingLoading)) {
    console.log('🔍 AppRoutes: Showing loading screen');
    return <LoadingScreen message="Checking authentication..." />;
  }

  // Additional routing debug logs
  if (isAuthenticated && hasCompletedOnboarding) {
    console.log('🔍 AppRoutes: Routing to main app');
  } else if (isAuthenticated && !hasCompletedOnboarding) {
    console.log('🔍 AppRoutes: Routing authenticated user to onboarding');
  } else {
    console.log('🔍 AppRoutes: Routing unauthenticated user to auth');
  }

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      {isAuthenticated ? (
        hasCompletedOnboarding ? (
          // User is authenticated and has completed onboarding
          <>
            <Route path="/dashboard" element={<Index />} />
            <Route path="/scan" element={<Index />} />
            <Route path="/tips" element={<Index />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/" element={<Index />} />
            <Route path="*" element={<Index />} />
          </>
        ) : (
          // User is authenticated but needs onboarding - ALWAYS send to /auth
          <>
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<Auth />} />
          </>
        )
      ) : (
        // User is not authenticated
        <>
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<Auth />} />
        </>
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
