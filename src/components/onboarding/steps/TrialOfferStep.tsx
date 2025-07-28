import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { Capacitor } from '@capacitor/core';

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
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 px-4 py-8"
    >
      <div className="w-full max-w-md mx-auto flex flex-col items-center bg-black/70 rounded-3xl shadow-2xl p-8 border border-white/10">
        <span className="text-5xl mb-6">💎</span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white text-center mb-6 tracking-tight">We offer a monthly plan of $9.99 per month for you to enjoy OutfitGrader AI.</h1>
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-orange-400 mb-1">$9.99</span>
          <span className="text-base text-white/70 mb-2">per month</span>
        </div>
        <Button
          onClick={onNext}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-xl font-extrabold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl text-white mb-4"
        >
          Continue
        </Button>
        <div className="text-white/40 text-xs text-center mt-2">Cancel anytime. No hidden fees.</div>
      </div>
    </motion.div>
  );
};
