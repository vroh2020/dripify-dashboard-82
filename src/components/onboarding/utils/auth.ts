
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

export const handleGoogleSignIn = async (): Promise<boolean> => {
  try {
    console.log('Starting Google Sign In...');
    console.log('Current origin:', window.location.origin);
    
    // Use the actual current origin, not any hardcoded URLs
    const redirectUrl = `${window.location.origin}/auth`;
    console.log('Redirect URL set to:', redirectUrl);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });
    
    if (error) {
      console.error('Google Sign In error:', error);
      return false;
    }
    
    console.log('Google OAuth initiated successfully');
    return true;
  } catch (error) {
    console.error('Google Sign In error:', error);
    return false;
  }
};

export const handleAppleSignIn = async (): Promise<boolean> => {
  try {
    console.log('Starting Apple Sign In...');
    
    const redirectUrl = `${window.location.origin}/auth`;
    console.log('Apple redirect URL set to:', redirectUrl);
    
    if (Capacitor.isNativePlatform()) {
      const options = {
        clientId: 'com.dripmax.app',
        redirectURI: 'https://jjqwhxamjxsiotnhhqco.supabase.co/auth/v1/callback',
        scopes: 'email name',
        state: generateSecureRandom(10),
        nonce: generateSecureRandom(10),
      };

      const result = await SignInWithApple.authorize(options);
      
      if (result.response.identityToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: result.response.identityToken,
        });
        
        if (error) throw error;
        return true;
      }
    } else {
      // For web, use Supabase OAuth
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUrl
        }
      });
      
      if (error) throw error;
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('Apple Sign In error:', error);
    return false;
  }
};

export const handleContinueWithEmail = async (): Promise<boolean> => {
  try {
    // Simply return true to continue with onboarding without auth
    // User will be prompted to authenticate later if needed
    return true;
  } catch (error) {
    console.error('Error in continue with email:', error);
    return true;
  }
};

export { generateSecureRandom };
