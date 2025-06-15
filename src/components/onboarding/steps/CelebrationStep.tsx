
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PartyPopper } from "lucide-react";

interface CelebrationStepProps {
  isPro: boolean;
  onNext: () => void;
  onComplete: () => void;
}

export const CelebrationStep = ({ isPro, onNext, onComplete }: CelebrationStepProps) => {
  const handleClick = () => {
    console.log('Celebration button clicked:', { isPro });
    if (isPro) {
      console.log('Going to handleCompleteOnboarding');
      onComplete();
    } else {
      console.log('Going to trial-offer');
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
      className="flex flex-col h-full"
    >
      {/* Top Section - Content */}
      <div className="flex-1 flex flex-col justify-center items-center space-y-8 pt-8">
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
        >
          <PartyPopper className="w-20 h-20 text-orange-400 mx-auto" />
        </motion.div>
        <div className="space-y-4 text-center">
          <h2 className="text-3xl font-bold text-white">Congratulations!</h2>
          <p className="text-white/80 text-lg leading-relaxed px-4">
            You've just experienced the power of Drip Max!<br />
            {isPro ? 
              "You already have Pro access - enjoy unlimited style analyses!" :
              "Ready to unlock your full style potential?"
            }
          </p>
        </div>
      </div>

      {/* Bottom Section - Button */}
      <div className="pb-6">
        <Button
          onClick={handleClick}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-14 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl"
        >
          {isPro ? "Continue to App" : "Next"}
        </Button>
      </div>
    </motion.div>
  );
};
