import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export const handleAppleSignIn = async (): Promise<boolean> => {
  try {
    console.log('Starting Apple Sign-In flow...');
    console.log('Platform:', Capacitor.getPlatform());
    console.log('Is native:', Capacitor.isNativePlatform());
    
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      console.log('Using native iOS Apple Sign-In');
      return await handleNativeAppleSignIn();
    } else {
      console.log('Using web Apple Sign-In');
      return await handleWebAppleSignIn();
    }
  } catch (error) {
    console.error('Apple Sign-In flow error:', error);
    return false;
  }
};

const handleNativeAppleSignIn = async (): Promise<boolean> => {
  try {
    const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
    
    // SIMPLIFIED: Use standard options without complex redirects
    const options = {
      clientId: 'service.com.genstyle.app',
      redirectURI: 'https://dripify-dashboard-82.lovable.app/auth/callback',
      scopes: 'email name',
      state: 'native-ios',
      nonce: 'nonce'
    };

    console.log('Starting native Apple Sign-In...');
    
    const result = await SignInWithApple.authorize(options);
    console.log('Apple Sign-In result received');

    if (!result.response.identityToken) {
      console.error('No identity token received from Apple');
      return false;
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: result.response.identityToken,
      nonce: 'nonce'
    });

    if (error) {
      console.error('Supabase auth error:', error);
      return false;
    }

    console.log('Successfully authenticated with Supabase!');
    return true;
    
  } catch (error) {
    console.error('Native Apple Sign-In error:', error);
    // REMOVED fallback to web - keep flows separate
    return false;
  }
};

const handleWebAppleSignIn = async (): Promise<boolean> => {
  try {
    console.log('Using web Apple Sign-In OAuth flow');
    
    if (Capacitor.isNativePlatform()) {
      // SIMPLIFIED native web auth: use standard OAuth with proper deep linking
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: 'com.genstyle.app://auth/callback',
          queryParams: {
            scope: 'name email'
          }
          // REMOVED skipBrowserRedirect - let Supabase handle it
        }
      });

      if (error || !data.url) {
        console.error('Error getting auth URL:', error);
        return false;
      }

      console.log('Opening auth URL in browser:', data.url);
      
      // SIMPLIFIED browser opening
      await Browser.open({
        url: data.url,
        windowName: '_self'
      });

      return true;
    } else {
      // SIMPLIFIED web OAuth
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/`,
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