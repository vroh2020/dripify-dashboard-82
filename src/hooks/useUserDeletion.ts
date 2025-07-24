import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useUserDeletion = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const deleteUserAccount = async (userId: string) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User ID not found",
        variant: "destructive",
      });
      return false;
    }

    setIsDeleting(true);

    try {
      // 1. Delete user's style analyses
      const { error: analysesError } = await supabase
        .from('style_analyses')
        .delete()
        .eq('user_id', userId);

      if (analysesError) {
        console.error('Error deleting style analyses:', analysesError);
        throw new Error('Failed to delete style analyses');
      }

      // 2. Delete user's images from storage
      const { data: storageList, error: listError } = await supabase.storage
        .from('public')
        .list(`lovable-uploads/${userId}`);

      if (!listError && storageList && storageList.length > 0) {
        const filePaths = storageList.map(file => `lovable-uploads/${userId}/${file.name}`);
        const { error: deleteFilesError } = await supabase.storage
          .from('public')
          .remove(filePaths);
        if (deleteFilesError) {
          console.error('Error deleting user files:', deleteFilesError);
          // Don't throw here - continue with account deletion even if files fail
        }
      }

      // 3. Delete user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
        throw new Error('Failed to delete profile');
      }

      // 4. Delete the actual auth user (this must be last)
      // const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      // if (authError) {
      //   console.error('Error deleting auth user:', authError);
      //   throw new Error('Failed to delete user account');
      // }
      // Call the Edge Function instead
      // Get the user's access token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // Call the Edge Function instead
      const functionUrl = 'https://jjqwhxamjxsiotnhhqco.functions.supabase.co/delete-user';
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error deleting auth user via Edge Function:', error);
        throw new Error('Failed to delete user account');
      }

      // 5. Sign out the current session
      await supabase.auth.signOut();

      // 6. Clear any local storage or cached data
      localStorage.clear();
      sessionStorage.clear();

      // 7. Force a full reload to reset all app state
      setTimeout(() => {
        window.location.href = '/auth';
      }, 300); // 300ms delay to ensure session is cleared

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });

      // 7. Navigate back to auth
      // navigate('/auth', { replace: true });
      // window.location.href = '/auth';

      return true;
    } catch (error) {
      console.error('Account deletion failed:', error);
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete account",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteUserAccount,
    isDeleting
  };
}; 