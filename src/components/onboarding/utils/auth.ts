import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export const handleAppleSignIn = async (): Promise<boolean> => {
  try {
    console.log('Starting Apple Sign-In flow...');
    console.log('Platform:', Capacitor.getPlatform());
    console.log('Is native:', Capacitor.isNativePlatform());
    
    // Always use web-based Apple Sign-In for reliability
    console.log('Using web-based Apple Sign-In');
    return await handleWebAppleSignIn();
  } catch (error) {
    console.error('Apple Sign-In flow error:', error);
    return false;
  }
};

const handleWebAppleSignIn = async (): Promise<boolean> => {
  try {
    console.log('Using web-based Apple Sign-In with Supabase OAuth');
    
    if (Capacitor.isNativePlatform()) {
      // For native: use Browser plugin with proper redirect handling
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: 'https://ijqwhxamjxsiotnhhqco.supabase.co/auth/v1/callback',
          queryParams: {
            scope: 'name email'
          },
          skipBrowserRedirect: false // Let Supabase handle the redirect
        }
      });

      if (error || !data.url) {
        console.error('Error getting auth URL:', error);
        return false;
      }

      console.log('Opening auth URL in browser:', data.url);
      
      // Open in browser - Supabase will handle the callback
      await Browser.open({
        url: data.url,
        windowName: '_self'
      });

      return true;
    } else {
      // For web: regular OAuth - force localhost for development
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const redirectUrl = isLocalhost ? 'http://localhost:8000/' : `${window.location.origin}/`;
      
      console.log('🔄 Using redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            scope: 'name email'
          }
        }
      });

      if (error) {
        console.error('Web Apple Sign-In error:', error);
        return false;
      }

      return true;
    }
  } catch (error) {
    console.error('Apple Sign-In failed:', error);
    return false;
  }
};



export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    return !error && !!user;
  } catch (error) {
    return false;
  }
};

/**
 * Get the current user
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      return null;
    }
    return user;
  } catch (error) {
    return null;
  }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}; 