import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAppStore } from '@/store/appStore';
import { subscriptionService } from '@/services/subscriptionService';
import { NewOnboarding } from '@/components/onboarding/NewOnboarding';

// Lazy load components for better performance
const Index = lazy(() => import('./pages/Index'));
const Profile = lazy(() => import('./pages/Profile'));

// Loading component
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex flex-col justify-center items-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mb-4"></div>
    <p className="text-white/70">Loading...</p>
  </div>
);

// Query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Main app routes component
const AppRoutes: React.FC = () => {
  const { 
    isInitialized, 
    isLoading, 
    onboardingCompleted, 
    error 
  } = useAppStore();

  // Show loading screen during initialization
  if (!isInitialized || isLoading) {
    return <LoadingScreen />;
  }

  // Show error state if needed
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex flex-col justify-center items-center px-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
          <p className="text-white/70">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Refresh App
          </button>
        </div>
      </div>
    );
  }

  const handleOnboardingComplete = () => {
    // Force navigation to dashboard after onboarding
    window.location.href = '/dashboard';
  };

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Onboarding route */}
        <Route 
          path="/onboarding" 
          element={
            onboardingCompleted ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <NewOnboarding onComplete={handleOnboardingComplete} />
            )
          } 
        />
        
        {/* Main app routes - only accessible after onboarding */}
        {onboardingCompleted ? (
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
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        )}
      </Routes>
    </Suspense>
  );
};

// App initialization hook
const useAppInitialization = () => {
  const { initialize } = useAppStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing app...');
        
        // Initialize app store (handles user detection, onboarding status, etc.)
        await initialize();
        
        // Initialize subscription service
        await subscriptionService.initialize();
        
        console.log('✅ App initialization complete');
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        // App store will handle the error state
      }
    };

    initializeApp();
  }, [initialize]);
};

// Main App component
const App: React.FC = () => {
  useAppInitialization();

  // Add debug helpers in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).debugApp = {
        store: useAppStore.getState(),
        reset: () => {
          useAppStore.getState().reset();
          window.location.reload();
        },
        forceOnboarding: () => {
          useAppStore.getState().setOnboardingCompleted(false);
          window.location.href = '/onboarding';
        },
        forceDashboard: () => {
          useAppStore.getState().setOnboardingCompleted(true);
          window.location.href = '/dashboard';
        }
      };
      
      console.log('🛠️ Debug helpers available: window.debugApp');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </BrowserRouter>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;