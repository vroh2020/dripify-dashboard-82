import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2 } from 'lucide-react';

export const AccountDeletion: React.FC = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account', {
        method: 'POST',
      });

      if (error) throw error;

      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently deleted.",
      });

      // Sign out and redirect to home
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Account deletion failed:', error);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete your account. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="p-6 border-destructive/20">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Delete Account
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              className="w-full"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete My Account'}
            </Button>
          </AlertDialogTrigger>
          
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and remove all of your data from our servers, including:
                <ul className="mt-2 ml-4 list-disc">
                  <li>Your profile information</li>
                  <li>All style analyses</li>
                  <li>Saved outfits</li>
                  <li>Subscription data</li>
                  <li>Achievement progress</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
};