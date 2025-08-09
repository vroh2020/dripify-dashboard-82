import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { SubscriptionProvider } from "./components/subscription/SubscriptionProvider";
import { AuthErrorBoundary } from "./components/auth/AuthErrorBoundary";
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
  // Temporarily force dashboard as the first screen and hide Auth

  return (
    <Routes>
      {/* Temporarily redirect /auth to /dashboard */}
      <Route 
        path="/auth" 
        element={<Navigate to="/dashboard" replace />} 
      />
      
      {/* Dashboard routes - only if completed onboarding and paid */}
      {/* Always expose dashboard routes during this temporary state */}
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
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
