import React from 'react';
import { Button } from '@/components/ui/button';

interface ColorVibeStepProps {
  onNext: (answer: string) => void;
}

const options = [
  'Vibrant', 'Neutral', 'Both'
];

export const ColorVibeStep = ({ onNext }: ColorVibeStepProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-8">
      <h2 className="text-2xl font-bold mb-6 text-center">Do you prefer vibrant or neutral colors?</h2>
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