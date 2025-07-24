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
  const lastRevenueCatUserId = useRef<string | null>(null);
  const lastLogInTime = useRef<number>(0);
  const revenueCatStats = useRef({ 
    totalCalls: 0, 
    throttledCalls: 0, 
    executedCalls: 0,
    userIdChanges: 0 
  });

  // Add global debug function for monitoring
  useEffect(() => {
    (window as any).getRevenueCatStats = () => {
      const stats = revenueCatStats.current;
      const throttleRate = stats.totalCalls > 0 ? (stats.throttledCalls / stats.totalCalls * 100).toFixed(1) : '0';
      console.log(`📊 RevenueCat Auth Stats:`, {
        totalCalls: stats.totalCalls,
        executedCalls: stats.executedCalls,
        throttledCalls: stats.throttledCalls,
        throttleRate: `${throttleRate}%`,
        userIdChanges: stats.userIdChanges,
        lastUserId: lastRevenueCatUserId.current,
        lastLogInTime: new Date(lastLogInTime.current).toISOString()
      });
      return stats;
    };
  }, []);

  useEffect(() => {
    if (authState.user && Capacitor.isNativePlatform()) {
      const now = Date.now();
      revenueCatStats.current.totalCalls++;
      
      // Check if this is a user ID change (important for anonymous → Apple transitions)
      const isUserIdChange = lastRevenueCatUserId.current !== authState.user.id;
      const isTimeThrottled = now - lastLogInTime.current <= 5000;
      
      if (isUserIdChange) {
        revenueCatStats.current.userIdChanges++;
        console.log(`🔄 User ID change detected: ${lastRevenueCatUserId.current} → ${authState.user.id}`);
      }
      
      // Only log in if user ID changed or at least 5 seconds have passed
      if (isUserIdChange || !isTimeThrottled) {
        lastRevenueCatUserId.current = authState.user.id;
        lastLogInTime.current = now;
        revenueCatStats.current.executedCalls++;
        
        console.log('🚀 Auth user identified, logging into RevenueCat...', authState.user.id);
        import('@revenuecat/purchases-capacitor').then(({ Purchases }) => {
          Purchases.logIn({ appUserID: authState.user.id })
            .then(() => {
              console.log('✅ RevenueCat login successful from useAuth effect');
              // Optionally trigger a subscription status refresh after user change
              if (isUserIdChange) {
                console.log('🔄 User changed - subscription status may need refreshing');
              }
            })
            .catch(error => {
              console.error('❌ RevenueCat login failed from useAuth effect', error);
              // Don't throw here - let the user continue with limited functionality
            });
        });
      } else {
        revenueCatStats.current.throttledCalls++;
        console.log('⏳ Skipping RevenueCat logIn to avoid rate limit');
        
        // Log stats every 10 throttled calls for monitoring
        if (revenueCatStats.current.throttledCalls % 10 === 0) {
          const throttleRate = (revenueCatStats.current.throttledCalls / revenueCatStats.current.totalCalls * 100).toFixed(1);
          console.log(`📊 RevenueCat Throttle Stats: ${revenueCatStats.current.executedCalls} executed, ${revenueCatStats.current.throttledCalls} throttled (${throttleRate}% throttled)`);
        }
      }
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

    // Clear any pending timeout to debounce rapid updates
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Don't update state during sign out process
    if (isSigningOut.current && !session) {
      return;
    }
    
    // Debounce rapid state changes
    timeoutRef.current = setTimeout(() => {
      setAuthState({
        session,
        user: session?.user || null,
        isLoading: false,
        isAuthenticated: !!session?.user,
        error: error || null
      });
    }, 50); // 50ms debounce
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
    let lastEventData: { event: string; session: Session | null } | null = null;
    let eventTimeout: NodeJS.Timeout | null = null;

    // Get initial session
    getInitialSession();

    // Listen for auth changes with aggressive deduplication
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current || isSigningOut.current) return;
      
      // Clear any pending timeout
      if (eventTimeout) {
        clearTimeout(eventTimeout);
      }
      
      // Aggressive deduplication - ignore rapid identical events
      const currentEventData = { event, session };
      const isDuplicate = lastEventData && 
        event === lastEventData.event && 
        JSON.stringify(session?.user?.id) === JSON.stringify(lastEventData.session?.user?.id);
      
      if (isDuplicate) {
        console.log('🚫 Auth: Ignoring duplicate', event);
        return;
      }
      
      lastEventData = currentEventData;
      
      // Batch updates with timeout to prevent rapid firing
      eventTimeout = setTimeout(() => {
        if (event === 'INITIAL_SESSION') {
          // Only log initial session once
          if (!initialSessionChecked.current) {
            console.log(`🔐 Auth: ${event}`, { hasSession: !!session, userId: session?.user?.id });
          }
        } else {
          // Log other important events
          console.log(`🔐 Auth: ${event}`, { hasSession: !!session, userId: session?.user?.id });
        }
        
        if (event === 'INITIAL_SESSION') {
          if (initialSessionChecked.current) return;
          initialSessionChecked.current = true;
        }
        
        updateAuthState(session);
      }, 100); // 100ms batching delay
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      if (eventTimeout) {
        clearTimeout(eventTimeout);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []); // Keep empty dependency array

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