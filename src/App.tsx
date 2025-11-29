import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import Auth from "./pages/Auth";
import { SubscriptionProvider } from "./components/subscription/SubscriptionProvider";
import { AuthErrorBoundary } from "./components/auth/AuthErrorBoundary";

// Lazy load non-critical components
const Index = lazy(() => import("./pages/Index"));
const Profile = lazy(() => import("./pages/Profile"));
const BackgroundRemovalDebugger = lazy(() => import("./components/BackgroundRemovalDebugger").then(m => ({ default: m.BackgroundRemovalDebugger })));

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
            <Navigate to="/dashboard" replace /> : 
            <Auth />
        } 
      />
      
      {/* Debug route - always accessible for testing */}
      <Route 
        path="/debug/background-removal" 
        element={
          <Suspense fallback={null}>
            <BackgroundRemovalDebugger />
          </Suspense>
        } 
      />
      
      {/* Dashboard routes - only if completed onboarding and paid */}
      {shouldShowDashboard ? (
        <>
          <Route 
            path="/scan" 
            element={
              <Suspense fallback={null}>
                <Index />
              </Suspense>
            } 
          />

          <Route 
            path="/closet" 
            element={
              <Suspense fallback={null}>
                <Index />
              </Suspense>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <Suspense fallback={null}>
                <Profile />
              </Suspense>
            } 
          />
          <Route path="/" element={<Navigate to="/scan" replace />} />
          <Route path="*" element={<Navigate to="/scan" replace />} />
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
