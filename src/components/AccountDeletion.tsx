import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/hooks/useOnboarding';
import { resetDeviceId } from '@/utils/device';
import { useToast } from '@/hooks/use-toast';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export const AccountDeletion: React.FC<{ onReset?: () => void }> = ({ onReset }) => {
  const { resetOnboarding } = useOnboarding();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirmStep, setConfirmStep] = useState(0); // 0 = initial, 1 = confirm, 2 = final confirm
  const { toast } = useToast();
  const { signOut } = useAuth();

  const handleDelete = async () => {
    if (confirmStep < 2) {
      setConfirmStep(confirmStep + 1);
      return;
    }

    setIsDeleting(true);
    setError(null);
    
    try {
      toast({
        title: "Deleting your data...",
        description: "This may take a moment. Please don't close the app.",
      });

      // Step 1: Reset onboarding data
      await resetOnboarding.mutateAsync();
      
      // Step 2: Reset device ID
      await resetDeviceId();
      
      // Step 3: Clear any additional local storage
      localStorage.removeItem('dripify_onboarding_completed');
      localStorage.removeItem('dripify_onboarding_progress');
      localStorage.removeItem('dripify_device_id');
      
      // Step 4: Clear session storage
      sessionStorage.clear();

      setSuccess(true);
      
      toast({
        title: "Data deleted successfully",
        description: "All your data has been removed. Redirecting to onboarding...",
      });

      setTimeout(async () => {
        setIsDeleting(false);
        setSuccess(false);
        setConfirmStep(0);
        
        if (onReset) {
          onReset();
        } else {
          // Force a complete app restart
          try {
            await signOut();
          } catch (err) {
            console.error('Error signing out:', err);
            // Force reload anyway
            window.location.href = '/onboarding';
          }
        }
      }, 2000);
    } catch (e: unknown) {
      console.error('Error deleting account:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to delete account. Please try again.';
      setError(errorMessage);
      setIsDeleting(false);
      
      toast({
        title: "Error deleting data",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setConfirmStep(0);
    setError(null);
  };

  if (isDeleting) {
    return (
      <Card className="bg-orange-500/10 backdrop-blur-lg border-orange-500/30">
        <CardContent className="p-8 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mx-auto mb-4" />
          <div className="text-lg text-orange-400 font-medium">Deleting your data...</div>
          <p className="text-white/70 text-sm mt-2">Please don't close the app while we remove your data.</p>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="bg-green-500/10 backdrop-blur-lg border-green-500/30">
        <CardContent className="p-8 text-center">
          <div className="text-lg text-green-400 font-medium">Account deleted successfully!</div>
          <p className="text-white/70 text-sm mt-2">Redirecting to onboarding...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-red-500/10 backdrop-blur-lg border-red-500/30">
      <CardHeader>
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-red-400" />
          Delete Your Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        {confirmStep === 0 && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white/90 text-sm font-medium">Warning</p>
                <p className="text-white/70 text-sm">This will permanently delete all your onboarding data, style analyses, and subscription information for this device.</p>
              </div>
            </div>
            <p className="text-white/70 text-sm">
              This action cannot be undone. Your data will be completely removed from our systems.
            </p>
            {error && (
              <div className="text-red-400 text-sm p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                {error}
              </div>
            )}
            <Button 
              onClick={handleDelete} 
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium"
              disabled={isDeleting}
            >
              I understand, delete my data
            </Button>
          </div>
        )}

        {confirmStep === 1 && (
          <div className="space-y-4">
            <p className="text-white/90 font-medium">Are you absolutely sure?</p>
            <p className="text-white/70 text-sm">
              This will delete:
            </p>
            <ul className="text-white/70 text-sm space-y-1 ml-4">
              <li>• All your style analyses and scores</li>
              <li>• Your onboarding progress</li>
              <li>• Any subscription data</li>
              <li>• All app preferences and settings</li>
            </ul>
            <div className="flex gap-3">
              <Button 
                onClick={handleCancel} 
                variant="outline" 
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDelete} 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, I'm sure
              </Button>
            </div>
          </div>
        )}

        {confirmStep === 2 && (
          <div className="space-y-4">
            <p className="text-white/90 font-medium">Final confirmation</p>
            <p className="text-red-400 text-sm font-medium">
              This is your last chance to cancel. Once you proceed, your data will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <Button 
                onClick={handleCancel} 
                variant="outline" 
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDelete} 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                DELETE EVERYTHING
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};