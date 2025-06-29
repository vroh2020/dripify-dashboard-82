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
      console.log('Apple Sign-In not available on this platform');
      // For web or Android, you could redirect to regular email auth
      return false;
    }
  } catch (error) {
    console.error('Apple Sign-In flow error:', error);
    return false;
  }
};

const handleNativeAppleSignIn = async (): Promise<boolean> => {
  try {
    const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
    
    // Native iOS Apple Sign-In - no redirect URLs needed!
    const options = {
      clientId: 'service.com.genstyle.app',
      redirectURI: 'com.genstyle.app://auth/callback', // This is ignored for native
      scopes: 'email name',
      state: '12345',
      nonce: 'nonce'
    };

    console.log('Starting Apple Sign-In with options:', options);
    
    const result = await SignInWithApple.authorize(options);
    console.log('Apple Sign-In result received');

    if (!result.response.identityToken) {
      console.error('No identity token received from Apple');
      return false;
    }

    // Send token directly to Supabase - no redirects needed!
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