import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Auth from "./pages/Auth";
import { SubscriptionProvider } from "./components/subscription/SubscriptionProvider";
import { AuthErrorBoundary } from "./components/auth/AuthErrorBoundary";


// Import components directly
import Index from "./pages/Index";
import Profile from "./pages/Profile";

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
  // Simple anonymous onboarding flow logic
  const hasCompletedOnboarding = localStorage.getItem('onboarding_completed') === 'true';
  const hasPaid = localStorage.getItem('subscription_active') === 'true';

  // Simple routing logic:
  // - If user has completed onboarding AND paid, show dashboard
  // - Otherwise, show onboarding
  const shouldShowDashboard = hasCompletedOnboarding && hasPaid;

  return (
    <Routes>
      {/* Onboarding route - always accessible */}
      <Route 
        path="/auth" 
        element={
          shouldShowDashboard ? 
            <Navigate to="/colors" replace /> : 
            <Auth />
        } 
      />
      
      {/* Core Trendza routes - 3 pillars only */}
      {shouldShowDashboard ? (
        <>
          <Route path="/colors" element={<Index />} />
          <Route path="/closet" element={<Index />} />
          <Route path="/search" element={<Index />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/" element={<Navigate to="/colors" replace />} />
          <Route path="*" element={<Navigate to="/colors" replace />} />
        </>
      ) : (
        // Not completed onboarding or not paid - redirect to auth
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
