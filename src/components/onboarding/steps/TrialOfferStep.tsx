
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";

interface TrialOfferStepProps {
  onNext: () => void;
}

export const TrialOfferStep = ({ onNext }: TrialOfferStepProps) => {
  return (
    <motion.div
      key="trial-offer"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col h-full"
    >
      {/* Top Section - Content */}
      <div className="flex-1 flex flex-col justify-center items-center space-y-8 pt-8">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Crown className="w-20 h-20 text-orange-400 mx-auto" />
        </motion.div>
        <div className="space-y-4 text-center px-4">
          <h1 className="text-3xl font-bold text-white leading-tight">
            We offer<br />
            <span className="text-orange-400 text-4xl">7 days free</span><br />
            so everyone can<br />
            max their drip with<br />
            <span className="text-orange-400">Drip Max</span>
          </h1>
        </div>
      </div>
      
      {/* Bottom Section - Button */}
      <div className="pb-6">
        <Button
          onClick={onNext}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-14 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl"
        >
          Try for Free
        </Button>
      </div>
    </motion.div>
  );
};
