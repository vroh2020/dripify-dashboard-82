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
  const { isLoading: authLoading, isAuthenticated, user } = useAuth();
  const { isLoading: onboardingLoading, hasCompletedOnboarding } = useOnboardingStatus();
  
  // Handle deep link auth callbacks
  useAppUrlHandler();

  // Show loading screen while auth or onboarding status is loading
  if (authLoading || onboardingLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  console.log('🔍 App Routing Decision:', {
    isAuthenticated,
    hasCompletedOnboarding,
    user: !!user
  });

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      
      {/* Protected dashboard routes */}
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
      
      {/* Fallback to auth */}
      <Route path="*" element={<Auth />} />
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
