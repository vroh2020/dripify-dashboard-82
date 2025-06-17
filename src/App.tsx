
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { ModernOnboarding } from '@/components/onboarding/ModernOnboarding';
import Profile from '@/pages/Profile';
import Index from '@/pages/Index';
import RevenueCatSimpleTestPage from '@/pages/RevenueCatSimpleTest';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SimpleSubscriptionProvider } from '@/components/subscription/SimpleSubscriptionProvider';

function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { session, user } = useSession();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error("Error fetching onboarding status:", error);
            // If there's an error (like column doesn't exist), assume onboarding not completed
            setShowOnboarding(true);
            return;
          }

          // Check if onboarding_completed exists and is false
          const onboardingCompleted = data && typeof data === 'object' && 'onboarding_completed' in data 
            ? (data as any).onboarding_completed 
            : false;

          if (!onboardingCompleted) {
            console.log('Onboarding not completed, showing onboarding');
            setShowOnboarding(true);
          } else {
            console.log('Onboarding already completed');
            setShowOnboarding(false);
          }
        } catch (error) {
          console.error('Unexpected error checking onboarding status:', error);
          setShowOnboarding(true);
        }
      } else {
        console.log('No user session, hiding onboarding');
        setShowOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [session, user]);

  const handleOnboardingComplete = (userData: any) => {
    console.log('Onboarding completed with data:', userData);
    setShowOnboarding(false);
  };

  return (
    <QueryClientProvider client={new QueryClient()}>
      <BrowserRouter>
        <SimpleSubscriptionProvider>
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
            <Routes>
              <Route path="/" element={<Index />} />

              <Route
                path="/onboarding"
                element={
                  session ? (
                    showOnboarding ? (
                      <ModernOnboarding onComplete={handleOnboardingComplete} />
                    ) : (
                      <Navigate to="/profile" replace />
                    )
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/test-revenuecat"
                element={<RevenueCatSimpleTestPage />}
              />

              <Route
                path="/login"
                element={
                  session ? (
                    <Navigate to="/profile" replace />
                  ) : (
                    <div className="flex justify-center items-center min-h-screen">
                      <Auth
                        supabaseClient={supabase}
                        appearance={{ theme: ThemeSupa }}
                        providers={['google', 'github']}
                        redirectTo={`${window.location.origin}/profile`}
                      />
                    </div>
                  )
                }
              />
            </Routes>
          </div>
        </SimpleSubscriptionProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
