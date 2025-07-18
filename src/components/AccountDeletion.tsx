import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/hooks/useOnboarding';
import { resetDeviceId } from '@/utils/device';

export const AccountDeletion: React.FC<{ onReset: () => void }> = ({ onReset }) => {
  const { resetOnboarding } = useOnboarding();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await resetOnboarding.mutateAsync();
      await resetDeviceId();
      setSuccess(true);
      setTimeout(() => {
        setIsDeleting(false);
        setSuccess(false);
        onReset(); // Parent should reset onboarding state
      }, 1500);
    } catch (e: any) {
      setError(e.message || 'Failed to delete account.');
      setIsDeleting(false);
    }
  };

  if (isDeleting) return <div className="p-8 text-center text-lg text-orange-500">Deleting your data...</div>;
  if (success) return <div className="p-8 text-center text-lg text-green-500">Account deleted. Restarting onboarding...</div>;

  return (
    <div className="p-8 max-w-md mx-auto text-center">
      <h2 className="text-2xl font-bold mb-4 text-white">Delete Your Data</h2>
      <p className="mb-6 text-white/70">This will permanently delete all your onboarding and subscription data for this device. This action cannot be undone.</p>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl px-6 py-3">
        Yes, delete everything
      </Button>
    </div>
  );
};