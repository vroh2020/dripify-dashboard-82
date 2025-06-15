
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

// Helper function to determine if we're on mobile
const isMobile = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const handleGoogleSignIn = async (): Promise<boolean> => {
  try {
    console.log('Starting Google Sign In...');
    console.log('Platform:', isMobile() ? 'Mobile' : 'Web');
    
    const redirectUrl = isMobile() 
      ? 'com.genstyle.app://auth/callback'
      : `${window.location.origin}/auth`;
    
    console.log('Using redirect URL:', redirectUrl);
    
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
    console.log('Platform:', isMobile() ? 'Mobile' : 'Web');
    
    if (isMobile()) {
      // Native Apple Sign In for mobile
      const options = {
        clientId: 'com.genstyle.app',
        redirectURI: 'com.genstyle.app://auth/callback',
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
      // Web Apple Sign In
      const redirectUrl = `${window.location.origin}/auth`;
      console.log('Apple redirect URL set to:', redirectUrl);
      
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
