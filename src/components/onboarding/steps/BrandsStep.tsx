import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface BrandsStepProps {
  onNext: (answer: string) => void;
}

export const BrandsStep = ({ onNext }: BrandsStepProps) => {
  const [value, setValue] = useState('');
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-8">
      <h2 className="text-2xl font-bold mb-6 text-center">Name your top 3 favorite brands.</h2>
      <input
        className="w-full max-w-xs h-12 px-4 mb-6 rounded-xl border border-gray-300 text-lg"
        type="text"
        placeholder="e.g. Nike, Zara, Uniqlo"
        value={value}
        onChange={e => setValue(e.target.value)}
      />
      <Button
        className="w-full max-w-xs h-14 text-lg font-medium rounded-xl"
        onClick={() => value && onNext(value)}
        disabled={!value.trim()}
      >
        Next
      </Button>
    </div>
  );
}; 