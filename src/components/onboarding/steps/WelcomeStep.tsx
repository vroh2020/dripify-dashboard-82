import React from 'react';
import { Button } from '@/components/ui/button';

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep = ({ onNext }: WelcomeStepProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-8">
      <h1 className="text-4xl font-extrabold mb-8 text-center">Welcome to Dripify AI</h1>
      <Button
        className="w-full max-w-xs h-14 text-lg font-medium rounded-xl"
        onClick={onNext}
      >
        Let's get started
      </Button>
    </div>
  );
};
