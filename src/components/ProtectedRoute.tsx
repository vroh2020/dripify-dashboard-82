
import { Navigate, useLocation } from 'react-router-dom';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { Paywall } from './Paywall';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const location = useLocation();
  const { isSubscribed, isLoading } = useSubscriptionStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isSubscribed) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Upgrade to Premium</h1>
        <Paywall
          onPurchaseComplete={() => {
            // The subscription state will be updated automatically
            // through the RevenueCat listener
          }}
        />
      </div>
    );
  }

  return <>{children}</>;
};
