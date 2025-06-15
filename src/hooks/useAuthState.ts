
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuthState() {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    isLoading: true,
    isAuthenticated: false
  });

  const updateAuthState = useCallback((session: Session | null) => {
    setAuthState({
      session,
      user: session?.user || null,
      isLoading: false,
      isAuthenticated: !!session?.user
    });
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        updateAuthState(null);
        return;
      }
      
      updateAuthState(session);
    } catch (error) {
      console.error('Session refresh error:', error);
      updateAuthState(null);
    }
  }, [updateAuthState]);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      console.log('Auth state change:', event);
      updateAuthState(session);
    });

    // Then get initial session
    refreshSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [updateAuthState, refreshSession]);

  return {
    ...authState,
    refreshSession
  };
}
