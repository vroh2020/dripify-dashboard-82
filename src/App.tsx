import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import Auth from "./pages/Auth";
import { SubscriptionProvider } from "./components/subscription/SubscriptionProvider";
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
  // Route gating model — free-tier friendly.
  //
  // We now allow the dashboard to render for any user that has:
  //   1. Completed authentication (live `useAuth`), AND
  //   2. Completed onboarding (the localStorage flag the paywall
  //      completion path sets — `AuthOnboardingWizard.handlePaywallComplete`
  //      writes `onboarding_completed=true` for both paid and free tiers).
  //
  // We deliberately do NOT gate on `isPro` here anymore. The previous
  // `isAuthenticated && isPro` rule meant free-tier users could never
  // reach `/scan` even after the paywall flow completed, which forced
  // `Auth.tsx` to fall back to a full-document `window.location.href`
  // reload that wiped React state and re-rendered the paywall on
  // remount — the "second paywall's X button bounces back to first
  // paywall" loop bug.
  //
  // The premium feature gating still happens inside pages
  // (ScanView/ClosetView/Profile read `useSubscription().isPro`), so
  // free-tier users land in the dashboard with premium features
  // disabled, which is the standard freemium model.
  //
  // The localStorage read is scoped to ONBOARDING COMPLETION, not
  // subscription status, so a momentarily-cleared cache key cannot
  // bounce a paid user.
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const onboardingCompletedFromCache =
    typeof window !== 'undefined'
      ? localStorage.getItem('onboarding_completed') === 'true'
      : false;

  // IMPORTANT: both branches must consult the cached
  // `onboarding_completed` flag. If we only consult it during
  // `authLoading`, then the moment auth resolves (`isAuthenticated`
  // flips true for any logged-in user), the gate degenerates to a
  // pure auth check — which would let a brand-new user mid-onboarding
  // through to /scan before the wizard has run. The paywall flow writes
  // `onboarding_completed=true` only via
  // `AuthOnboardingWizard.handlePaywallComplete`, so reading the flag
  // on both sides of the loading boundary is the single source of truth.
  const hasCompletedOnboarding = authLoading
    ? onboardingCompletedFromCache
    : isAuthenticated && onboardingCompletedFromCache;

  // Optimistic during auth loading: a real subscriber should never see
  // a flash of `/auth` on launch, but if the cache says onboarding is
  // not done we must NOT bypass the wizard.
  const shouldShowDashboard = hasCompletedOnboarding;

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
      
      {/* Dashboard routes - only if completed onboarding (free or paid) */}
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
        // Not authenticated or onboarding not yet completed.
        // Free-tier and paid users who finished onboarding fall into the
        // dashboard branch above; this is strictly the "haven't onboarded
        // yet" -> kick them back to /auth path.
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