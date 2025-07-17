import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { OnboardingPhotoPicker } from '../OnboardingPhotoPicker';

interface SelfieStepProps {
  onNext: (file: File | null) => void;
}

export const SelfieStep = ({ onNext }: SelfieStepProps) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-8">
      <h2 className="text-2xl font-bold mb-6 text-center">Upload a quick selfie (optional)</h2>
      <div className="w-full max-w-xs mb-8">
        <OnboardingPhotoPicker selectedImage={selectedImage} onImageSelect={setSelectedImage} />
      </div>
      <Button
        className="w-full max-w-xs h-14 text-lg font-medium rounded-xl"
        onClick={() => onNext(selectedImage)}
      >
        Next
      </Button>
    </div>
  );
}; 