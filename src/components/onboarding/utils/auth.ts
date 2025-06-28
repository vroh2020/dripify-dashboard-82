import { supabase } from '@/integrations/supabase/client';

export const handleAppleSignIn = async (): Promise<boolean> => {
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