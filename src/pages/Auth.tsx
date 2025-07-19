import { SimpleOnboarding } from "@/components/onboarding/SimpleOnboarding";

export const Auth = () => {
  return <SimpleOnboarding onComplete={() => window.location.href = '/dashboard'} />;
};

export default Auth;
