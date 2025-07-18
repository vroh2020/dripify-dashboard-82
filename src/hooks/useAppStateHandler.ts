import { useEffect } from 'react';
import { persistenceManager } from '@/utils/persistenceManager';

export function useAppStateHandler() {
  useEffect(() => {
    const handleAppStateChange = async () => {
      try {
        // Use persistence manager to handle state changes without reloading
        await persistenceManager.handleAppStateChange();
      } catch (error) {
        console.error('Error handling app state change:', error);
      }
    };

    // Listen for visibility change (iOS Safari)
    document.addEventListener('visibilitychange', handleAppStateChange);
    
    // Listen for focus events (iOS app)
    window.addEventListener('focus', handleAppStateChange);

    return () => {
      document.removeEventListener('visibilitychange', handleAppStateChange);
      window.removeEventListener('focus', handleAppStateChange);
    };
  }, []);
}