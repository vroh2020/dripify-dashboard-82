import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface OnboardingStepProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onNext: () => void;
  nextButtonText?: string;
  nextButtonDisabled?: boolean;
  isLoading?: boolean;
  currentStep?: number;
  totalSteps?: number;
}

export const OnboardingStep: React.FC<OnboardingStepProps> = ({
  title,
  subtitle,
  children,
  onNext,
  nextButtonText = "Next",
  nextButtonDisabled = false,
  isLoading = false,
  currentStep,
  totalSteps
}) => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm mx-auto">
        {/* Progress dots */}
        {currentStep && totalSteps && (
          <div className="flex justify-center mb-8">
            <div className="flex space-x-2">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i < currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <Card className="p-8 border-0 shadow-none bg-transparent">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
            {subtitle && (
              <p className="text-muted-foreground text-sm">{subtitle}</p>
            )}
          </div>

          <div className="mb-8">
            {children}
          </div>

          <Button
            onClick={onNext}
            disabled={nextButtonDisabled || isLoading}
            className="w-full h-12 text-lg font-medium rounded-xl"
            size="lg"
          >
            {isLoading ? 'Saving...' : nextButtonText}
          </Button>
        </Card>
      </div>
    </div>
  );
};