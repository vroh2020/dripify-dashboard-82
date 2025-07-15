import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useSubscription } from '@/components/subscription/SubscriptionProvider';

export const DebugOverlay = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const { hasCompletedOnboarding, isLoading: onboardingLoading, retryCount } = useOnboardingStatus();
  const { isPro, isLoading: subscriptionLoading } = useSubscription();

  useEffect(() => {
    // Show debug overlay if there are issues
    const timeout = setTimeout(() => {
      if (authLoading || onboardingLoading || subscriptionLoading) {
        setIsVisible(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [authLoading, onboardingLoading, subscriptionLoading]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs z-50 max-w-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">🐛 Debug Info</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-1">
        <div>Auth: {authLoading ? '🔄 Loading' : isAuthenticated ? '✅ Yes' : '❌ No'}</div>
        <div>User: {user ? `✅ ${user.email?.substring(0, 20)}...` : '❌ None'}</div>
        <div>Onboarding: {onboardingLoading ? '🔄 Loading' : hasCompletedOnboarding ? '✅ Complete' : '❌ Incomplete'}</div>
        <div>Pro: {subscriptionLoading ? '🔄 Loading' : isPro ? '✅ Yes' : '❌ No'}</div>
        <div>Retries: {retryCount}</div>
        <div>Path: {window.location.pathname}</div>
      </div>

      <div className="mt-3 space-y-1">
        <button 
          onClick={() => window.location.href = '/dashboard'}
          className="w-full bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
        >
          Force Dashboard
        </button>
        <button 
          onClick={() => window.location.href = '/auth'}
          className="w-full bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs"
        >
          Force Auth
        </button>
        <button 
          onClick={() => window.location.reload()}
          className="w-full bg-orange-600 hover:bg-orange-700 px-2 py-1 rounded text-xs"
        >
          Reload
        </button>
      </div>
    </div>
  );
}; 