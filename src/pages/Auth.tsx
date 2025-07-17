import { CalOnboarding } from "@/components/onboarding/CalOnboarding";

export const Auth = () => {
  return <CalOnboarding onComplete={() => window.location.href = '/dashboard'} />;
};

export default Auth;
