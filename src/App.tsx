import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import Auth from "./pages/Auth";
import { SubscriptionProvider, useSubscription } from "./components/subscription/SubscriptionProvider";
import { AuthErrorBoundary } from "./components/auth/AuthErrorBoundary";
import { useAuth } from "./hooks/useAuth";

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
  // Route gating is driven by the live `useAuth` + `useSubscription` React
  // state. The gate is optimistic during loading (defaults to `true`) so:
  //   1. A paid user never sees a brief flash of `/auth` on launch.
  //   2. There is no localStorage read in the gate path, so a momentarily
  //      cleared `subscription_active` key (the original "1-second bounce
  //      from Closet → Scan" symptom) cannot flip the gate.
  // Once loading resolves, the live hooks are authoritative: an
  // unauthenticated user is bounced to `/auth`, an unpaid user is bounced
  // once the SubscriptionProvider has confirmed sub state.
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isPro, isLoading: subLoading } = useSubscription();

  const hasCompletedOnboarding = authLoading ? true : isAuthenticated;
  const hasPaid = subLoading ? true : isPro;

  // Simple routing logic:
  // - While EITHER hook is still loading, optimistically assume the user
  //   is valid so we never bounce a paid user mid-session (the original
  //   "1-second bounce from Closet → Scan" symptom).
  // - Once loaded, gate strictly on the live `isAuthenticated && isPro`
  //   values. There is NO localStorage read in this gate, which is what
  //   makes it immune to momentarily-cleared cache keys.
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
  // 🔥 Background removal model now PRE-LOADS when user is logged in!
  // This makes first upload INSTANT instead of 40 seconds

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