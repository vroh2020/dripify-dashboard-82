import React, { useEffect } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useNavigate } from 'react-router-dom';

export const DashboardView: React.FC = () => {
  const { onboarding, isLoading } = useOnboarding();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!onboarding || !onboarding.onboarding_complete || !onboarding.subscription_active)) {
      navigate('/onboarding', { replace: true });
    }
  }, [onboarding, isLoading, navigate]);

  if (isLoading || !onboarding || !onboarding.onboarding_complete || !onboarding.subscription_active) {
    return <div className="p-8 text-center text-lg text-orange-500">Loading your dashboard...</div>;
  }

  // ... existing dashboard content ...
  return (
    <div className="p-8">
      {/* Dashboard content here */}
      <h1 className="text-3xl font-bold text-white mb-4">Welcome to your Dashboard!</h1>
      {/* ... */}
    </div>
  );
};