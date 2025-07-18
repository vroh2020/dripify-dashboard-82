import { ModernOnboarding } from "@/components/onboarding/ModernOnboarding";

export const Auth = () => {
  return <ModernOnboarding onComplete={() => window.location.href = '/'} />;
};

export default Auth;
