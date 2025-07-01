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
import { useAppUrlHandler } from "./hooks/useAppUrlHandler";
import { LoadingScreen } from "./components/LoadingScreen";
import { OnboardingInspector } from "./components/OnboardingInspector";

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
  
  // Handle deep link auth callbacks
  useAppUrlHandler();

  if (authLoading || (isAuthenticated && onboardingLoading)) {
    return <LoadingScreen message="Loading..." />;
  }

  const showApp = isAuthenticated && hasCompletedOnboarding;
  const showOnboarding = !isAuthenticated || !hasCompletedOnboarding;

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      {showApp ? (
        <>
          <Route path="/dashboard" element={<Index />} />
          <Route path="/scan" element={<Index />} />
          <Route path="/tips" element={<Index />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/" element={<Index />} />
          <Route path="*" element={<Index />} />
        </>
      ) : (
        <Route path="*" element={<Auth />} />
      )}
      {/* Development Route for Onboarding Inspector */}
      <Route path="/inspector" element={<OnboardingInspector />} />
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
