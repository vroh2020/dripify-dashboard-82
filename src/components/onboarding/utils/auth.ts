import { supabase } from "@/integrations/supabase/client";
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { Capacitor } from '@capacitor/core';

// Secure random generation utility
const generateSecureRandom = (length: number = 16): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += charset[values[i] % charset.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += charset[Math.floor(Math.random() * charset.length)];
    }
  }
  
  return result;
};

// Mobile detection utility
const isMobile = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const handleAppleSignIn = async (): Promise<boolean> => {
  try {
    console.log('🍎 Starting Apple Sign In...');
    console.log('🍎 Platform:', isMobile() ? 'Mobile' : 'Web');
    console.log('🍎 User Agent:', navigator.userAgent);
    
    if (isMobile()) {
      // Native Apple Sign In for mobile
      const nonce = generateSecureRandom(10);
      const state = generateSecureRandom(10);
      
      const options = {
        clientId: 'service.com.genstyle.app', // Use Services ID, not App ID
        redirectURI: 'https://jjqwhxamjxsiotnhhqco.supabase.co/auth/v1/callback', // Supabase callback URL
        scopes: 'email name',
        state: state,
        nonce: nonce,
      };

      console.log('🍎 Apple Sign In options:', options);
      const result = await SignInWithApple.authorize(options);
      console.log('🍎 Apple Sign In result:', result);
      
      if (result.response.identityToken) {
        console.log('🍎 Identity token received, sending to Supabase...');
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: result.response.identityToken,
          nonce: nonce, // Include the nonce for security
        });
        
        if (error) {
          console.error('🍎 Supabase auth error:', error);
          // Log more details for debugging
          console.error('🍎 Error details:', {
            message: error.message,
            status: error.status,
            code: error.code
          });
          throw error;
        }
        
        console.log('🍎 Apple Sign In successful - User:', data.user?.email);
        return true;
      } else {
        console.error('🍎 No identity token received from Apple');
        console.error('🍎 Full response:', result.response);
        return false;
      }
    } else {
      // Web Apple Sign In - uses Supabase OAuth flow
      console.log('🍎 Starting web Apple Sign In flow...');
      console.log('🍎 Current URL:', window.location.href);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth?apple_callback=true`,
          queryParams: {
            // Add some additional parameters for better debugging
            platform: 'web',
            timestamp: Date.now().toString()
          }
        }
      });
      
      if (error) {
        console.error('🍎 Web Apple Sign In error:', error);
        console.error('🍎 Error details:', {
          message: error.message,
          status: error.status,
          code: error.code
        });
        throw error;
      }
      console.log('🍎 Web Apple Sign In initiated - redirecting to Apple...');
      return true;
    }
  } catch (error: any) {
    console.error('🍎 Apple Sign In error:', error);
    
    // Enhanced error logging
    if (error.message) {
      console.error('🍎 Error message:', error.message);
    }
    if (error.code) {
      console.error('🍎 Error code:', error.code);
    }
    if (error.status) {
      console.error('🍎 HTTP status:', error.status);
    }
    
    // Check for specific Apple Sign In errors
    if (error.message?.includes('popup_closed')) {
      console.log('🍎 User closed the popup - this is normal behavior');
    } else if (error.message?.includes('network')) {
      console.log('🍎 Network error - check internet connection');
    } else if (error.message?.includes('409')) {
      console.log('🍎 Apple returned 409 Conflict - this may be due to repeated attempts or configuration issues');
    }
    
    return false;
  }
};

export { generateSecureRandom };
