
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
      className="text-center space-y-10 flex flex-col justify-center h-full"
    >
      <div className="space-y-8">
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
          <Crown className="w-24 h-24 text-orange-400 mx-auto" />
        </motion.div>
        <h1 className="text-4xl font-bold text-white leading-tight">
          We offer<br />
          <span className="text-orange-400 text-5xl">7 days free</span><br />
          so everyone can<br />
          max their drip with<br />
          <span className="text-orange-400">Drip Max</span>
        </h1>
      </div>
      
      <Button
        onClick={onNext}
        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-xl font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl"
      >
        Try for Free
      </Button>
    </motion.div>
  );
};
