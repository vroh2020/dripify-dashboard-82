import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import type { Session, User } from '@supabase/supabase-js';

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

  const mountedRef = useRef(true);
  const lastEventRef = useRef<string | null>(null);

  const updateAuthState = useCallback((session: Session | null, error?: string) => {
    if (!mountedRef.current) return;
    
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
    console.log('🚪 Starting complete sign out...');
    
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
      }
      
      // Clear auth state
      updateAuthState(null);
      
      console.log('✅ Complete sign out successful');
      
      // Navigate to auth page
      window.location.href = '/auth';
    } catch (error) {
      console.error('❌ Sign out error:', error);
      // Force reload as fallback
      window.location.reload();
    }
  }, [clearAllStorage, updateAuthState]);

  const refreshSession = useCallback(async () => {
    if (!mountedRef.current) return;
    
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

  // Single auth listener with proper cleanup
  useEffect(() => {
    mountedRef.current = true;
    let eventCount = 0;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mountedRef.current) return;
        
        if (error) {
          console.error('Error getting initial session:', error);
          updateAuthState(null, error.message);
          return;
        }
        
        updateAuthState(session);
      } catch (error) {
        if (!mountedRef.current) return;
        console.error('Initial session error:', error);
        updateAuthState(null, 'Failed to get session');
      }
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;
      
      eventCount++;
      
      // Reduce logging spam
      if (eventCount <= 3 || lastEventRef.current !== event || event === 'SIGNED_OUT') {
        console.log('🔐 Auth state change:', event);
        lastEventRef.current = event;
      }
      
      // Warn if too many rapid events
      if (eventCount > 10) {
        console.warn('⚠️ Many auth state changes detected. Possible infinite loop.', { eventCount, event });
      }
      
      updateAuthState(session);
    });

    // Timeout protection
    const loadingTimeout = setTimeout(() => {
      if (mountedRef.current && authState.isLoading) {
        console.warn('Auth loading timeout - completing with no session');
        updateAuthState(null);
      }
    }, 10000);

    getInitialSession();

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []); // Empty dependency array is correct here

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // CRITICAL FIX: Automatic session refresh to prevent silent expiry
  useEffect(() => {
    if (!authState.session || !authState.isAuthenticated) return;

    // Check if session is close to expiry (5 minutes before)
    const checkSessionExpiry = () => {
      if (!mountedRef.current || !authState.session) return;
      
      const expiresAt = authState.session.expires_at;
      if (!expiresAt) return;
      
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;
      
      // If session expires in less than 5 minutes, refresh it
      if (timeUntilExpiry < 300) { // 300 seconds = 5 minutes
        console.log('🔄 Session expiring soon, auto-refreshing...');
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
    if (!authState.session || authState.user || !authState.isAuthenticated) return;
    
    // If we have a session but no user (race condition), retry getting user
    let retryCount = 0;
    const maxRetries = 3;
    
    const retryGetUser = async () => {
      if (!mountedRef.current || retryCount >= maxRetries) return;
      
      retryCount++;
      console.log(`🔄 Retrying user fetch (attempt ${retryCount}/${maxRetries})...`);
      
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (!mountedRef.current) return;
        
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