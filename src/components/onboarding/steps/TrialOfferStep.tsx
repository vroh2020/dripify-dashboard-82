
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
      className="flex flex-col justify-between h-full text-center"
    >
      {/* Content Area */}
      <div className="flex-1 flex flex-col justify-center space-y-6 py-4">
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
          <Crown className="w-16 h-16 text-orange-400 mx-auto" />
        </motion.div>
        <div className="space-y-3 px-2">
          <h1 className="text-2xl font-bold text-white leading-tight">
            We offer<br />
            <span className="text-orange-400 text-3xl">7 days free</span><br />
            so everyone can<br />
            max their drip with<br />
            <span className="text-orange-400">Drip Max</span>
          </h1>
        </div>
      </div>
      
      {/* Button Area - Fixed bottom positioning */}
      <div className="pb-2 flex-shrink-0">
        <Button
          onClick={onNext}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-12 text-sm font-bold rounded-xl transition-all duration-300 hover:scale-105 shadow-2xl"
        >
          Try for Free
        </Button>
      </div>
    </motion.div>
  );
};
