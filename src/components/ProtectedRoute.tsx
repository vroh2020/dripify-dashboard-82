import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';


interface ProtectedRouteProps {
  children: ReactNode;
  requiresOnboarding?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requiresOnboarding = true 
}: ProtectedRouteProps) => {
  const { isLoading: authLoading, isAuthenticated, user } = useAuth();
  const { isLoading: onboardingLoading, hasCompletedOnboarding } = useOnboardingStatus();
  const location = useLocation();

  // Show loading while auth or onboarding status is being determined
  if (authLoading || onboardingLoading) {
    return <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-black mx-auto mb-4"></div>
        <p className="text-gray-600">Checking authentication...</p>
      </div>
    </div>;
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If onboarding is required and not completed, redirect to onboarding
  if (requiresOnboarding && !hasCompletedOnboarding) {
    return <Navigate to="/auth" replace />;
  }

  // User is authenticated and (if required) has completed onboarding
  return <>{children}</>;
}; 