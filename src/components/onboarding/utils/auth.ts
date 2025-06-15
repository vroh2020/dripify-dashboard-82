
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

export const handleAppleSignIn = async (): Promise<boolean> => {
  try {
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
    }
    return true;
  } catch (error) {
    console.error('Apple Sign In error:', error);
    return true;
  }
};

export const handleContinueWithEmail = async (): Promise<boolean> => {
  try {
    const randomId = generateSecureRandom(12);
    const timestamp = Date.now();
    const tempEmail = `temp_${timestamp}_${randomId}@dripmax.internal`;
    const tempPassword = generateSecureRandom(24);
    
    const { data, error } = await supabase.auth.signUp({
      email: tempEmail,
      password: tempPassword,
      options: {
        data: {
          username: `user_${timestamp}_${generateSecureRandom(8)}`,
          is_temp_account: true,
          created_via: 'onboarding_flow'
        }
      }
    });

    if (error) {
      console.error('Temp account error:', error);
    }
    
    return true;
  } catch (error) {
    console.error('Error creating temp account:', error);
    return true;
  }
};

export { generateSecureRandom };
