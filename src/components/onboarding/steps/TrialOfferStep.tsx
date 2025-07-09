import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { Capacitor } from '@capacitor/core';

interface TrialOfferStepProps {
  onNext: () => void;
}

export const TrialOfferStep = ({ onNext }: TrialOfferStepProps) => {
  const isWeb = !Capacitor.isNativePlatform();

  return (
    <motion.div
      key="trial-offer"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="h-full flex flex-col"
    >
      {/* Content Area - Centered */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="mb-8"
        >
          <Crown className="w-24 h-24 text-orange-400 mx-auto" />
        </motion.div>

        <div className="text-center">
          <p className="text-gray-400">
            We offer a monthly plan to try out Dripify AI
          </p>
        </div>
      </div>

      {/* Button Area - Fixed bottom */}
      <div className="px-8 pb-8">
        <Button
          onClick={onNext}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-xl font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl"
        >
          {isWeb ? "Try Web Demo" : "Continue to Free Trial"}
        </Button>
      </div>
    </motion.div>
  );
};
