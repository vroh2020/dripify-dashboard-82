import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

export const handleAppleSignIn = async (): Promise<boolean> => {
  try {
    console.log('🍎 Starting Apple Sign-In...');
    console.log('🍎 Platform:', Capacitor.getPlatform());
    
    // Use native Apple Sign-In on iOS, web OAuth elsewhere
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      console.log('🍎 Using native iOS Apple Sign-In');
      return await handleNativeAppleSignIn();
    } else {
      console.log('🍎 Using web Apple Sign-In');
      return await handleWebAppleSignIn();
    }
  } catch (error) {
    console.error('🍎 Apple Sign-In error:', error);
    return false;
  }
};

const handleNativeAppleSignIn = async (): Promise<boolean> => {
  try {
    const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
    
    console.log('🍎 Requesting Apple authorization...');
    
    // Simple options as per the official documentation
    const options = {
      clientId: 'service.com.genstyle.app',
      redirectURI: 'https://dripify-dashboard-82.lovable.app/auth',
      scopes: 'email name',
      state: '12345',
      nonce: 'nonce'
    };

    const result = await SignInWithApple.authorize(options);
    console.log('🍎 Apple authorization result:', result);

    if (!result.response.identityToken) {
      console.error('🍎 No identity token received');
      return false;
    }

    console.log('🍎 Signing in to Supabase with identity token...');
    const { error, data } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: result.response.identityToken,
      nonce: 'nonce'
    });

    if (error) {
      console.error('🍎 Supabase sign-in error:', error);
      return false;
    }

    console.log('🍎 Apple Sign-In successful!', data);
    return true;
    
  } catch (error) {
    console.error('🍎 Native Apple Sign-In error:', error);
    // Fallback to web-based Apple Sign-In if native fails
    console.log('🍎 Falling back to web-based Apple Sign-In...');
    return await handleWebAppleSignIn();
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
    console.error('🍎 Web Apple Sign-In error:', error);
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
      console.error('🔍 Get user error:', error);
      return null;
    }
    return user;
  } catch (error) {
    console.error('🔍 Get user exception:', error);
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
      console.error('🚪 Sign out error:', error);
      return false;
    }
    console.log('🚪 User signed out successfully');
    return true;
  } catch (error) {
    console.error('🚪 Sign out exception:', error);
    return false;
  }
}; 