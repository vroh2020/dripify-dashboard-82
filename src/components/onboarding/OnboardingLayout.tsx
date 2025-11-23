import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { ProgressIndicator } from "./ProgressIndicator";

interface OnboardingLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  showProgress?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
}

export const OnboardingLayout = ({
  children,
  currentStep,
  totalSteps,
  showProgress = true,
  showBackButton = false,
  onBack,
  className = ""
}: OnboardingLayoutProps) => {
  return (
    <div className={`container-mobile ${className}`}>
      {/* Header with back button only - no progress indicator */}
      <div className="flex items-center justify-between mb-8 safe-area-top">
        {showBackButton ? (
          <button 
            onClick={onBack}
            className="back-button"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
        ) : (
          <div className="w-10" /> // Spacer
        )}
        
        <div className="flex-1" />
      </div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex-1 flex flex-col"
      >
        {children}
      </motion.div>
    </div>
  );
};
