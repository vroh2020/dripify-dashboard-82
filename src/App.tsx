import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { ModernOnboarding } from '@/components/onboarding/ModernOnboarding';
import { ProfilePage } from '@/pages/ProfilePage';
import { HomePage } from '@/pages/HomePage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SimpleSubscriptionProvider } from '@/components/subscription/SimpleSubscriptionProvider';

function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { session, user } = useSession();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Error fetching onboarding status:", error);
          return;
        }

        if (!data?.onboarding_completed) {
          console.log('Onboarding not completed, showing onboarding');
          setShowOnboarding(true);
        } else {
          console.log('Onboarding already completed');
          setShowOnboarding(false);
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
              <Route path="/" element={<HomePage />} />

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
                    <ProfilePage />
                  </ProtectedRoute>
                }
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
