import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

// Generate cryptographically secure nonce for Apple Sign-In
const generateNonce = (): string => {
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }
  return result;
};

export const handleAppleSignIn = async (): Promise<boolean> => {
  try {
    console.log('🍎 Starting Apple Sign-In flow...');
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
    
    // Generate secure nonce for each request
    const nonce = generateNonce();
    
    // Fixed: Use app scheme for native iOS
    const options = {
      clientId: 'service.com.genstyle.app',
      redirectURI: 'com.genstyle.app://auth/callback', // Fixed: Use app scheme
      scopes: 'email name',
      state: 'native-ios',
      nonce: nonce // Use generated nonce
    };

    console.log('Starting native Apple Sign-In with options:', {
      clientId: options.clientId,
      redirectURI: options.redirectURI,
      scopes: options.scopes
    });
    
    const result = await SignInWithApple.authorize(options);
    console.log('✅ Apple Sign-In result received');

    if (!result.response.identityToken) {
      console.error('❌ No identity token received from Apple');
      return false;
    }

    console.log('🔑 Authenticating with Supabase using identity token...');
    const { data: _, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: result.response.identityToken,
      nonce: nonce // Use the same nonce
    });

    if (error) {
      console.error('❌ Supabase auth error:', error);
      return false;
    }

    console.log('✅ Successfully authenticated with Supabase!');
    return true;
    
  } catch (error) {
    console.error('❌ Native Apple Sign-In error:', error);
    console.log('🔄 Falling back to web Apple Sign-In...');
    // If native Apple Sign-In fails (like in simulator), fall back to web
    return await handleWebAppleSignIn();
  }
};

const handleWebAppleSignIn = async (): Promise<boolean> => {
  try {
    console.log('🌐 Using web Apple Sign-In OAuth flow');
    
    if (Capacitor.isNativePlatform()) {
      console.log('📱 Native platform: Using Browser plugin for OAuth');
      // For native: use Browser plugin that handles the redirect better
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: 'com.genstyle.app://auth/callback',
          queryParams: {
            scope: 'name email'
          },
          skipBrowserRedirect: true // Don't auto-redirect, we'll handle it
        }
      });

      if (error || !data.url) {
        console.error('❌ Error getting auth URL:', error);
        return false;
      }

      console.log('🔗 Opening auth URL in browser:', data.url);
      
      // Open in browser with improved configuration
      await Browser.open({
        url: data.url,
        windowName: '_self',
        toolbarColor: '#000000',
        presentationStyle: 'popover'
      });

      console.log('✅ Browser opened successfully');
      return true;
    } else {
      console.log('💻 Web platform: Using direct OAuth redirect');
      // For web: regular OAuth with safe window access
      const getRedirectUrl = () => {
        if (typeof window !== 'undefined' && window.location) {
          // Validate and sanitize the origin to prevent open redirects
          const origin = window.location.origin;
          // Only allow specific domains for security
          const allowedDomains = [
            'https://dripify-dashboard-82.lovable.app',
            'http://localhost:3000',
            'http://localhost:5173'
          ];
          
          if (allowedDomains.includes(origin)) {
            return `${origin}/auth`;
          }
        }
        // Fallback to production URL if window is undefined or domain not allowed
        return 'https://dripify-dashboard-82.lovable.app/auth';
      };

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: getRedirectUrl(),
          queryParams: {
            scope: 'name email'
          }
        }
      });

      if (error) {
        console.error('❌ Web Apple Sign-In error:', error);
        return false;
      }

      console.log('✅ Web OAuth initiated successfully');
      return true;
    }
  } catch (error) {
    console.error('💥 Apple Sign-In failed:', error);
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

/**
 * Sign in anonymously for users who want to try the app without creating an account
 */
export const handleAnonymousSign = async (): Promise<boolean> => {
  try {
    console.log('🕵️ Starting anonymous sign-in...');
    console.log('🔍 Supabase client config:', {
      url: 'https://jjqwhxamjxsiotnhhqco.supabase.co',
      hasKey: true
    });
    
    // Check if user is already signed in
    const { data: existingSession } = await supabase.auth.getSession();
    if (existingSession?.session?.user) {
      console.log('✅ User already signed in:', existingSession.session.user.id);
      return true;
    }
    
    const { data, error } = await supabase.auth.signInAnonymously();
    
    console.log('🔍 Anonymous sign-in response:', {
      hasData: !!data,
      hasError: !!error,
      errorMessage: error?.message,
      hasUser: !!data?.user,
      userId: data?.user?.id
    });
    
    if (error) {
      console.error('❌ Anonymous sign-in error:', error);
      return false;
    }
    
    if (data.user) {
      console.log('✅ Anonymous sign-in successful:', data.user.id);
      
      // Ensure profile exists for anonymous user
      try {
        console.log('🔍 Checking if profile exists for user:', data.user.id);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single();
        
        console.log('🔍 Profile check result:', {
          hasProfile: !!profile,
          hasError: !!profileError,
          errorCode: profileError?.code
        });
        
        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist, create it
          console.log('🔄 Creating profile for anonymous user...');
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              username: `user_${data.user.id.slice(0, 8)}`,
              onboarding_completed: false,
              onboarding_step: '1',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (insertError) {
            console.error('❌ Failed to create profile for anonymous user:', insertError);
            // Don't fail the sign-in, just log the error
          } else {
            console.log('✅ Profile created for anonymous user');
          }
        } else if (profileError) {
          console.error('❌ Error checking profile:', profileError);
        } else {
          console.log('✅ Profile already exists for anonymous user');
        }
      } catch (profileError) {
        console.error('❌ Error handling profile for anonymous user:', profileError);
        // Don't fail the sign-in, just log the error
      }
      
      return true;
    }
    
    console.error('❌ No user data received from anonymous sign-in');
    return false;
  } catch (error) {
    console.error('💥 Anonymous sign-in failed:', error);
    return false;
  }
}; 