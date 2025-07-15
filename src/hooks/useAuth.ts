import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import type { Session, User } from '@supabase/supabase-js';
import { useToast } from "@/hooks/use-toast";

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthActions {
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearAllStorage: () => Promise<void>;
}

export function useAuth(): AuthState & AuthActions {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null
  });

  // Add this effect to handle RevenueCat login
  useEffect(() => {
    if (authState.user && Capacitor.isNativePlatform()) {
      console.log('🚀 Auth user identified, logging into RevenueCat...', authState.user.id);
      import('@revenuecat/purchases-capacitor').then(({ Purchases }) => {
        Purchases.logIn({ appUserID: authState.user.id })
          .then(() => console.log('✅ RevenueCat login successful from useAuth effect'))
          .catch(error => console.error('❌ RevenueCat login failed from useAuth effect:', error));
      });
    }
  }, [authState.user]);

  const mountedRef = useRef(true);
  const lastEventRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialSessionChecked = useRef(false);
  const isSigningOut = useRef(false);
  const hasInitialized = useRef(false);
  const lastEventData = useRef<{ event: string; session: Session | null } | null>(null);

  const updateAuthState = useCallback((session: Session | null, error?: string) => {
    if (!mountedRef.current) return;

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Don't update state during sign out process
    if (isSigningOut.current && !session) {
      return;
    }
    
    setAuthState({
      session,
      user: session?.user || null,
      isLoading: false,
      isAuthenticated: !!session?.user,
      error: error || null
    });
  }, []);

  const clearAllStorage = useCallback(async () => {
    console.log('🧹 Clearing ALL storage types...');
    
    try {
      // Clear browser storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear Capacitor native storage on iOS
      if (Capacitor.isNativePlatform()) {
        try {
          const { Preferences } = await import('@capacitor/preferences');
          await Preferences.clear();
          console.log('✅ Capacitor native storage cleared');
        } catch (error) {
          console.log('⚠️ Capacitor Preferences not available, skipping native storage clear');
        }
      }
      
      // Clear any cached data
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Clear IndexedDB
      if (window.indexedDB) {
        try {
          const databases = await window.indexedDB.databases();
          await Promise.all(
            databases.map(db => {
              if (db.name) {
                return new Promise((resolve, reject) => {
                  const deleteReq = window.indexedDB.deleteDatabase(db.name!);
                  deleteReq.onsuccess = () => resolve(void 0);
                  deleteReq.onerror = () => reject(deleteReq.error);
                });
              }
            })
          );
        } catch (error) {
          console.warn('Could not clear IndexedDB:', error);
        }
      }
      
      console.log('✅ All storage cleared');
    } catch (error) {
      console.error('❌ Error clearing storage:', error);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (isSigningOut.current) {
      console.log('🚫 Sign out already in progress');
      return;
    }
    
    console.log('🚪 Starting complete sign out...');
    isSigningOut.current = true;
    
    try {
      // Clear all storage first
      await clearAllStorage();
      
      // Sign out from RevenueCat if on native platform
      if (Capacitor.isNativePlatform()) {
        try {
          const { Purchases } = await import('@revenuecat/purchases-capacitor');
          await Purchases.logOut();
          console.log('✅ RevenueCat logout successful');
        } catch (error) {
          console.log('⚠️ RevenueCat logout failed or not available:', error);
        }
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase sign out error:', error);
        throw error;
      }
      
      // Clear auth state immediately
      setAuthState({
        session: null,
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null
      });
      
      // Reset all refs
      initialSessionChecked.current = false;
      hasInitialized.current = false;
      lastEventData.current = null;
      
      console.log('✅ Complete sign out successful');
      
      // Redirect to welcome screen immediately
      window.location.href = '/auth';
      
    } catch (error) {
      console.error('❌ Sign out error:', error);
      window.location.reload();
    } finally {
      isSigningOut.current = false;
    }
  }, [clearAllStorage]);

  const refreshSession = useCallback(async () => {
    if (!mountedRef.current || isSigningOut.current) return;
    
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

  // Get initial session
  const getInitialSession = useCallback(async () => {
    if (initialSessionChecked.current || isSigningOut.current) return;
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!mountedRef.current) return;
      
      if (error) {
        console.error('Error getting initial session:', error);
        updateAuthState(null, error.message);
        return;
      }
      
      initialSessionChecked.current = true;
      updateAuthState(session);
    } catch (error) {
      if (!mountedRef.current) return;
      console.error('Initial session error:', error);
      updateAuthState(null, 'Failed to get session');
    }
  }, [updateAuthState]);

  // Single auth listener with proper cleanup
  useEffect(() => {
    mountedRef.current = true;
    let eventCount = 0;
    let lastEventTime = Date.now();

    // Start initial session check
    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current || isSigningOut.current) return;
      
      const now = Date.now();
      const timeSinceLastEvent = now - lastEventTime;
      lastEventTime = now;
      
      // Ignore rapid duplicate events
      if (lastEventData.current && 
          event === lastEventData.current.event && 
          JSON.stringify(session) === JSON.stringify(lastEventData.current.session) && 
          timeSinceLastEvent < 100) {
        return;
      }
      
      eventCount++;
      lastEventData.current = { event, session };
      
      // Handle INITIAL_SESSION specially
      if (event === 'INITIAL_SESSION') {
        if (initialSessionChecked.current) {
          return;
        }
        initialSessionChecked.current = true;
      }
      
      // Handle SIGNED_OUT specially
      if (event === 'SIGNED_OUT') {
        setAuthState({
          session: null,
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: null
        });
        return;
      }
      
      // Only update state if the session has actually changed
      const currentSession = authState.session;
      const sessionChanged = !currentSession !== !session || // One is null and the other isn't
        (currentSession && session && currentSession.access_token !== session.access_token);
      
      if (sessionChanged) {
        setAuthState({
          session,
          user: session?.user || null,
          isLoading: false,
          isAuthenticated: !!session?.user,
          error: null
        });
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []); // FIXED: Removed authState.session to prevent infinite re-renders

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      isSigningOut.current = false;
    };
  }, []);

  // CRITICAL FIX: Automatic session refresh to prevent silent expiry
  useEffect(() => {
    if (!authState.session || !authState.isAuthenticated || isSigningOut.current) return;

    // Check if session is close to expiry (5 minutes before)
    const checkSessionExpiry = () => {
      if (!mountedRef.current || !authState.session || isSigningOut.current) return;
      
      const expiresAt = authState.session.expires_at;
      if (!expiresAt) return;
      
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;
      
      // If session expires in less than 5 minutes, refresh it
      if (timeUntilExpiry < 300) { // 300 seconds = 5 minutes
        refreshSession();
      }
    };

    // Check immediately
    checkSessionExpiry();
    
    // Check every 2 minutes
    const interval = setInterval(checkSessionExpiry, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [authState.session, authState.isAuthenticated, refreshSession]);

  // CRITICAL FIX: Handle null user race condition with retry logic
  useEffect(() => {
    if (!authState.session || authState.user || !authState.isAuthenticated || isSigningOut.current) return;
    
    // If we have a session but no user (race condition), retry getting user
    let retryCount = 0;
    const maxRetries = 3;
    
    const retryGetUser = async () => {
      if (!mountedRef.current || retryCount >= maxRetries || isSigningOut.current) return;
      
      retryCount++;
      console.log(`🔄 Retrying user fetch (attempt ${retryCount}/${maxRetries})...`);
      
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (!mountedRef.current || isSigningOut.current) return;
        
        if (user && !error) {
          console.log('✅ User fetch retry successful');
          updateAuthState(authState.session);
        } else if (retryCount < maxRetries) {
          // Retry after delay
          setTimeout(retryGetUser, 1000 * retryCount); // Exponential backoff
        } else {
          console.warn('❌ User fetch failed after retries, signing out');
          updateAuthState(null, 'Failed to get user after retries');
        }
      } catch (error) {
        console.error('User retry error:', error);
        if (retryCount < maxRetries) {
          setTimeout(retryGetUser, 1000 * retryCount);
        }
      }
    };
    
    // Start retry after 500ms delay
    const timeout = setTimeout(retryGetUser, 500);
    
    return () => clearTimeout(timeout);
  }, [authState.session, authState.user, authState.isAuthenticated, updateAuthState]);

  return {
    ...authState,
    signOut,
    refreshSession,
    clearAllStorage
  };
} 