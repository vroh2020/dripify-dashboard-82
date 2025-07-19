import { ModernOnboarding } from './ModernOnboarding';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useEffect } from 'react';

interface CalOnboardingProps {
  onComplete: () => void;
}

export const CalOnboarding: React.FC<CalOnboardingProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { hasCompletedOnboarding } = useOnboardingStatus();

  // If onboarding is already completed, redirect to dashboard
  useEffect(() => {
    if (hasCompletedOnboarding) {
      navigate('/dashboard', { replace: true });
    }
  }, [hasCompletedOnboarding, navigate]);

  const handleOnboardingComplete = async () => {
    try {
      // Wait a moment for all state updates to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force a page reload to ensure all hooks are properly updated
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Fallback to navigation
      navigate('/dashboard', { replace: true });
    }
  };

  return <ModernOnboarding onComplete={handleOnboardingComplete} />;
};