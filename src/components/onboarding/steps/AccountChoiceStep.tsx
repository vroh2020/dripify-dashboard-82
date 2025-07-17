import React from 'react';
import { Button } from '@/components/ui/button';

interface AccountChoiceStepProps {
  onNext: (choice: 'Sign In with Apple' | 'Continue as Guest') => void;
}

export const AccountChoiceStep = ({ onNext }: AccountChoiceStepProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-8">
      <h2 className="text-2xl font-bold mb-8 text-center">Save your progress?</h2>
      <div className="w-full max-w-xs space-y-4">
        <Button
          className="w-full h-14 text-lg font-medium rounded-xl"
          onClick={() => onNext('Sign In with Apple')}
        >
          Sign In with Apple
        </Button>
        <Button
          className="w-full h-14 text-lg font-medium rounded-xl"
          onClick={() => onNext('Continue as Guest')}
        >
          Continue as Guest
        </Button>
      </div>
    </div>
  );
}; 