import React from 'react';
import { Button } from '@/components/ui/button';

interface PaywallStepProps {
  onPurchase: () => void;
  onContinueFree: () => void;
}

export const PaywallStep = ({ onPurchase, onContinueFree }: PaywallStepProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-8">
      <h2 className="text-2xl font-bold mb-6 text-center">Unlock unlimited outfit analyses, personalized style reports, early-access trends, cancel anytime.</h2>
      <div className="w-full max-w-xs space-y-4 mb-8">
        <Button
          className="w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-orange-500 to-purple-600 text-white"
          onClick={onPurchase}
        >
          Unlock Premium
        </Button>
        <Button
          className="w-full h-14 text-lg font-medium rounded-xl"
          onClick={onContinueFree}
        >
          Continue with Free Plan
        </Button>
      </div>
      <div className="text-center text-gray-500 text-sm">
        Cancel anytime. No account required for purchase. Subscription unlocks all features.
      </div>
    </div>
  );
}; 