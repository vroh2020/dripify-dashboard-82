import React from 'react';
import { ModernOnboarding } from './ModernOnboarding';

export const OnboardingFlow = () => {
  return <ModernOnboarding onComplete={() => window.location.reload()} />;
};
