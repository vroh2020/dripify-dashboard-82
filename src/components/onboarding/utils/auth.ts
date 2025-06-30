import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export const handleAppleSignIn = async (): Promise<boolean> => {
  try {
    console.log('🚀 Starting Apple Sign-In flow...');
    console.log('📱 Platform:', Capacitor.getPlatform());
    console.log('🔧 Is native:', Capacitor.isNativePlatform());
    
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      console.log('✅ Using NATIVE iOS Apple Sign-In - STAYS IN APP');
      console.log('🚫 Will NOT open Safari or external browser');
      
      try {
        return await handleNativeAppleSignIn();
      } catch (nativeError) {
        console.error('💥 Native Apple Sign-In failed completely:', nativeError);
        console.log('🚫 NOT falling back to web OAuth to avoid Safari redirect');
        return false;
      }
    } else {
      console.log('🌐 Using web-based Apple Sign-In for non-iOS platforms');
      return await handleWebAppleSignIn();
    }
  } catch (error) {
    console.error('💥 Apple Sign-In flow error:', error);
    return false;
  }
};

const handleNativeAppleSignIn = async (): Promise<boolean> => {
  try {
    console.log('🔍 Checking if native Apple Sign-In plugin is available...');
    
    // Check if the plugin is available
    const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
    
    if (!SignInWithApple) {
      console.error('❌ Apple Sign-In plugin not available');
      throw new Error('Apple Sign-In plugin not available');
    }
    
    console.log('✅ Apple Sign-In plugin loaded successfully');
    
    // Generate secure random nonce
    const nonce = crypto.randomUUID();
    
    // Native iOS Apple Sign-In - stays in the app!
    const options = {
      clientId: 'service.com.genstyle.app',
      redirectURI: 'com.genstyle.app://auth/callback', // This is ignored for native
      scopes: 'email name',
      state: '12345',
      nonce: nonce
    };

    console.log('🍎 Starting NATIVE Apple Sign-In with options:', { 
      clientId: options.clientId,
      scopes: options.scopes,
      state: options.state,
      nonce: '[REDACTED]'
    });
    
    console.log('📱 This should open Apple Sign-In popup INSIDE the app (not Safari)');
    
    const result = await SignInWithApple.authorize(options);
    console.log('✅ Apple Sign-In result received from native plugin');
    console.log('🔍 Result structure:', {
      hasResponse: !!result.response,
      hasIdentityToken: !!result.response?.identityToken,
      hasEmail: !!result.response?.email,
      hasUser: !!result.response?.user
    });

    if (!result.response.identityToken) {
      console.error('❌ No identity token received from Apple');
      return false;
    }

    console.log('🔐 Sending identity token to Supabase...');
    
    // Send token directly to Supabase - no redirects needed!
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: result.response.identityToken,
      nonce: nonce
    });

    if (error) {
      console.error('❌ Supabase auth error:', error);
      return false;
    }

    console.log('🎉 Successfully authenticated with Supabase via NATIVE Apple Sign-In!');
    console.log('👤 User authenticated:', !!data.user);
    return true;
    
  } catch (error) {
    console.error('💥 Native Apple Sign-In failed:', error);
    console.error('📝 Error details:', {
      message: error.message,
      code: error.code,
      name: error.name
    });
    
    // Don't fall back to web - let the user know native failed
    throw error;
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