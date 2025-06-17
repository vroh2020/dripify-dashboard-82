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
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SimpleSubscriptionProvider } from '@/components/subscription/SimpleSubscriptionProvider';
import { DashboardView } from '@/components/DashboardView';

function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { session, user } = useSession();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Error fetching onboarding status:", error);
          return;
        }

        // Check if onboarding is completed (adjust field name based on your schema)
        const onboardingCompleted = data?.completed_onboarding || data?.onboarding_completed || false;
        
        if (!onboardingCompleted) {
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
              {/* Main app routes */}
              <Route path="/*" element={<Index />} />
              <Route path="/dashboard" element={<Index />} />
              <Route path="/scan" element={<Index />} />
              <Route path="/tips" element={<Index />} />

              {/* Auth route - FIXED! */}
              <Route
                path="/auth"
                element={
                  session ? (
                    showOnboarding ? (
                      <Navigate to="/onboarding" replace />
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  ) : (
                    <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] via-[#2C1F3D] to-[#1A1F2C] flex justify-center items-center">
                      <div className="w-full max-w-md mx-auto p-6">
                        <div className="text-center mb-8">
                          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 text-transparent bg-clip-text mb-2">
                            Welcome to DripMax
                          </h1>
                          <p className="text-white/70">Sign in to start your style journey</p>
                        </div>
                        <Auth
                          supabaseClient={supabase}
                          appearance={{ 
                            theme: ThemeSupa,
                            style: {
                              button: { background: '#f97316', color: 'white', borderRadius: '8px' },
                              anchor: { color: '#f97316' },
                            }
                          }}
                          providers={['google', 'github']}
                          redirectTo={`${window.location.origin}/dashboard`}
                        />
                      </div>
                    </div>
                  )
                }
              />

              {/* Onboarding route */}
              <Route
                path="/onboarding"
                element={
                  session ? (
                    showOnboarding ? (
                      <ModernOnboarding onComplete={handleOnboardingComplete} />
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  ) : (
                    <Navigate to="/auth" replace />
                  )
                }
              />

              {/* Profile route */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Legacy login route - redirect to auth */}
              <Route
                path="/login"
                element={<Navigate to="/auth" replace />}
              />
            </Routes>
          </div>
        </SimpleSubscriptionProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
