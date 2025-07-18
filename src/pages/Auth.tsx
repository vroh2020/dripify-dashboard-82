import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";

export const Auth = () => {
  const navigate = useNavigate();
  const { hasCompletedOnboarding } = useOnboardingStatus();

  useEffect(() => {
    // If onboarding is not completed, redirect to onboarding
    if (!hasCompletedOnboarding) {
      navigate('/onboarding', { replace: true });
    } else {
      // If onboarding is completed, redirect to dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [hasCompletedOnboarding, navigate]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex flex-col justify-center items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mb-4"></div>
      <p className="text-white/70">Redirecting...</p>
    </div>
  );
};

export default Auth;
