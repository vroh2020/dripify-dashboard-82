import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

interface AuthDebugInfo {
  timestamp: string;
  platform: string;
  isNative: boolean;
  url: string;
  supabaseSession: any;
  supabaseUser: any;
  localStorage: Record<string, any>;
  sessionStorage: Record<string, any>;
  appState: {
    isAuthenticated: boolean;
    hasOnboarding: boolean;
  };
}

export const debugAuth = async (): Promise<AuthDebugInfo> => {
  const timestamp = new Date().toISOString();
  
  console.log('🔍 Starting auth debug analysis...');
  
  // Get Supabase state
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  // Get local storage
  const localStorageData: Record<string, any> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      localStorageData[key] = localStorage.getItem(key);
    }
  }
  
  // Get session storage
  const sessionStorageData: Record<string, any> = {};
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key) {
      sessionStorageData[key] = sessionStorage.getItem(key);
    }
  }
  
  const debugInfo: AuthDebugInfo = {
    timestamp,
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
    url: window.location.href,
    supabaseSession: {
      hasSession: !!session,
      expiresAt: session?.expires_at,
      accessToken: session?.access_token ? 'present' : 'missing',
      refreshToken: session?.refresh_token ? 'present' : 'missing',
      error: sessionError
    },
    supabaseUser: {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      error: userError
    },
    localStorage: localStorageData,
    sessionStorage: sessionStorageData,
    appState: {
      isAuthenticated: !!session && !!user,
      hasOnboarding: false // Will be updated by app
    }
  };
  
  console.log('📊 Auth Debug Report:', debugInfo);
  
  return debugInfo;
};

export const clearAuthState = async () => {
  console.log('🧹 Clearing all auth state...');
  
  // Sign out from Supabase
  await supabase.auth.signOut();
  
  // Clear storage
  localStorage.clear();
  sessionStorage.clear();
  
  console.log('✅ Auth state cleared. Reloading...');
  window.location.reload();
};

export const fixAuthState = async () => {
  console.log('🔧 Attempting to fix auth state...');
  
  try {
    // Force refresh session
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('❌ Session refresh failed:', error);
      return false;
    }
    
    console.log('✅ Session refreshed successfully');
    return true;
  } catch (error) {
    console.error('💥 Fix auth state failed:', error);
    return false;
  }
};

// Make functions available globally for console debugging
declare global {
  interface Window {
    debugAuth: () => Promise<AuthDebugInfo>;
    clearAuthState: () => Promise<void>;
    fixAuthState: () => Promise<boolean>;
    enableAuthDebug: () => void;
  }
}

// Auto-setup debug functions
if (typeof window !== 'undefined') {
  window.debugAuth = debugAuth;
  window.clearAuthState = clearAuthState;
  window.fixAuthState = fixAuthState;
  window.enableAuthDebug = () => {
    localStorage.setItem('supabase.auth.debug', 'true');
    console.log('✅ Supabase auth debug enabled');
  };
  
  console.log('🛠️ Auth debug helpers loaded:');
  console.log('- window.debugAuth() - Get complete auth state');
  console.log('- window.clearAuthState() - Clear all auth data');
  console.log('- window.fixAuthState() - Try to fix broken auth');
  console.log('- window.enableAuthDebug() - Enable Supabase debug logs');
} 