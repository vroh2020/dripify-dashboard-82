import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

export const handleAppleSignIn = async (): Promise<boolean> => {
  try {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      return await handleNativeAppleSignIn();
    } else {
      return await handleWebAppleSignIn();
    }
  } catch (error) {
    return false;
  }
};

const handleNativeAppleSignIn = async (): Promise<boolean> => {
  try {
    const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
    
    const options = {
      clientId: 'service.com.genstyle.app',
      redirectURI: 'com.genstyle.app://auth/callback',
      scopes: 'email name',
      state: '12345',
      nonce: 'nonce'
    };

    const result = await SignInWithApple.authorize(options);

    if (!result.response.identityToken) {
      return false;
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: result.response.identityToken,
      nonce: 'nonce'
    });

    return !error;
    
  } catch (error) {
    return false;
  }
};

const handleWebAppleSignIn = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        queryParams: {
          scope: 'name email'
        }
      }
    });

    return !error;
  } catch (error) {
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