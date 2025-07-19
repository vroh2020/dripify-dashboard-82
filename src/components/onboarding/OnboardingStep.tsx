import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

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
  showNextButton?: boolean; // New prop to control button visibility
  autoAdvance?: boolean; // New prop to indicate auto-advancing steps
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
  totalSteps,
  showNextButton = true,
  autoAdvance = false
}) => {
  return (
    <motion.div
      key={title}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col h-screen bg-gradient-to-br from-black via-purple-900/20 to-black"
    >
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-8">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            {subtitle && <p className="text-white/70">{subtitle}</p>}
            {autoAdvance && !isLoading && (
              <p className="text-orange-400/80 text-sm">
                Select an option to continue automatically
              </p>
            )}
            {isLoading && autoAdvance && (
              <p className="text-green-400/80 text-sm">
                Advancing to next step...
              </p>
            )}
          </div>
          
          <div className="mt-8">
            {children}
          </div>
        </div>
      </div>

      {/* Only show Next button when explicitly requested */}
      {showNextButton && (
        <div className="flex-shrink-0 px-6 pb-8">
          <Button
            onClick={onNext}
            disabled={nextButtonDisabled || isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl"
          >
            {isLoading ? 'Loading...' : nextButtonText}
          </Button>
        </div>
      )}
    </motion.div>
  );
};