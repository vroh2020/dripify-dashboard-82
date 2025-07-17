import React from 'react';
import { Button } from '@/components/ui/button';

interface AgeRangeStepProps {
  onNext: (answer: string) => void;
}

const options = [
  'Under 18', '18–24', '25–34', '35–44', '45+'
];

export const AgeRangeStep = ({ onNext }: AgeRangeStepProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-8">
      <h2 className="text-2xl font-bold mb-6 text-center">What's your age range?</h2>
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