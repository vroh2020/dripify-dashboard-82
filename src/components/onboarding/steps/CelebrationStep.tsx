import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PartyPopper } from "lucide-react";
import { useEffect } from "react";

interface CelebrationStepProps {
  isPro: boolean;
  onNext: () => void;
  onComplete: () => void;
}

export const CelebrationStep = ({ isPro, onNext, onComplete }: CelebrationStepProps) => {
  // Automatically complete onboarding for Pro users without showing UI
  useEffect(() => {
    if (isPro) {
      console.log('✅ User is already Pro - auto-completing onboarding directly');
      // Small delay to prevent jarring instant navigation
      setTimeout(() => {
        onComplete();
      }, 500);
    }
  }, [isPro, onComplete]);

  const handleClick = () => {
    console.log('🎉 Celebration button clicked:', { isPro });
    
    // IMPROVED LOGIC: More precise handling
    if (isPro) {
      console.log('✅ User is already Pro - completing onboarding directly');
      onComplete();
    } else {
      console.log('💳 User needs Pro subscription - proceeding to trial offer');
      onNext();
    }
  };

  return (
    <motion.div
      key="celebration"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="h-full flex flex-col"
    >
      {/* Content Area - Centered */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mb-8"
        >
          <PartyPopper className="w-24 h-24 text-orange-400 mx-auto" />
        </motion.div>
        
        <div className="text-center space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Congratulations!
          </h2>
          <p className="text-white/80 text-xl leading-relaxed max-w-md">
            You've just experienced the power of Drip Max!
          </p>
          
          <div className="space-y-4">
            <p className="text-white/70 text-lg leading-relaxed max-w-sm">
              Ready to unlock unlimited style analyses and premium features?
            </p>
            <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-4">
              <p className="text-orange-300 font-medium">
                🔥 7-day free trial available
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Button Area - Fixed bottom */}
      <div className="px-8 pb-8">
        <Button
          onClick={handleClick}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-xl font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl"
        >
          {isPro ? "Continue to Dashboard" : "Unlock Pro Features"}
        </Button>
      </div>
    </motion.div>
  );
};
