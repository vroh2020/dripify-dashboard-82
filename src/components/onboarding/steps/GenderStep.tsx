import React from 'react';
import { Button } from '@/components/ui/button';

interface GenderStepProps {
  onNext: (answer: string) => void;
}

const options = [
  'Male', 'Female', 'Non-binary', 'Prefer not to say'
];

export const GenderStep = ({ onNext }: GenderStepProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-8">
      <h2 className="text-2xl font-bold mb-6 text-center">What's your gender identity?</h2>
      <div className="w-full max-w-xs space-y-4">
        {options.map(option => (
          <Button
            key={option}
            className="w-full h-14 text-lg font-medium rounded-xl"
            onClick={() => onNext(option)}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}; 