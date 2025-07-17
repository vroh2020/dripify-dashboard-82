import React from 'react';
import { Button } from '@/components/ui/button';

interface FinalConfirmStepProps {
  onNext: () => void;
}

export const FinalConfirmStep = ({ onNext }: FinalConfirmStepProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-8">
      <h2 className="text-2xl font-bold mb-8 text-center">Ready to get styled by AI?</h2>
      <Button
        className="w-full max-w-xs h-14 text-lg font-medium rounded-xl"
        onClick={onNext}
      >
        Next
      </Button>
    </div>
  );
}; 