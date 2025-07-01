import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export function useAuthState() {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null
  });

  // Use ref to avoid stale closures in timeout
  const authStateRef = useRef(authState);
  authStateRef.current = authState;
  
  // Track last logged event to prevent spam
  const lastLoggedEvent = useRef<string | null>(null);

  const updateAuthState = useCallback((session: Session | null, error?: string) => {
    setAuthState({
      session,
      user: session?.user || null,
      isLoading: false,
      isAuthenticated: !!session?.user,
      error: error || null
    });
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        updateAuthState(null, error.message);
        return;
      }
      
      updateAuthState(session);
    } catch (error) {
      console.error('Session refresh error:', error);
      updateAuthState(null, 'Failed to refresh session');
    }
  }, [updateAuthState]);

  const forceRefresh = useCallback(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    let mounted = true;
    let eventCount = 0;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      eventCount++;
      
      // Reduce logging spam - only log significant changes or first few events
      if (eventCount <= 3 || lastLoggedEvent.current !== event || event === 'SIGNED_OUT') {
        console.log('Auth state change:', event);
        lastLoggedEvent.current = event;
      }
      
      // Warn if too many rapid events (possible infinite loop)
      if (eventCount > 10) {
        console.warn('⚠️ Many auth state changes detected. Possible infinite loop.', { eventCount, event });
      }
      
      updateAuthState(session);
    });

    // Timeout only for stuck states
    const loadingTimeout = setTimeout(() => {
      if (mounted && authStateRef.current.isLoading) {
        console.warn('Auth loading timeout - force refresh');
        forceRefresh();
      }
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []); 

  return {
    ...authState,
    refreshSession,
    forceRefresh
  };
}
