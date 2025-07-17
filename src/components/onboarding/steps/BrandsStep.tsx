import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface BrandsStepProps {
  onNext: (answer: string) => void;
}

export const BrandsStep = ({ onNext }: BrandsStepProps) => {
  const [brands, setBrands] = useState('');

  return (
    <motion.div
      key="brands"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="h-full flex flex-col"
    >
      {/* Content Area - Centered */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-8">
        <div className="space-y-6 text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-white mb-4">Name your top 3 favorite brands</h2>
            <p className="text-white/70 text-base leading-relaxed max-w-sm">
              This helps us understand your style preferences
            </p>
          </motion.div>
        </div>

        {/* Input */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full max-w-sm mb-8"
        >
          <Input
            type="text"
            placeholder="e.g. Nike, Zara, Uniqlo"
            value={brands}
            onChange={(e) => setBrands(e.target.value)}
            className="h-14 text-lg bg-white/5 border-white/10 text-white placeholder:text-white/50 focus:border-orange-500 focus:ring-orange-500"
          />
        </motion.div>
      </div>

      {/* Button Area - Fixed bottom */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="px-6 pb-8"
      >
        <Button
          onClick={() => onNext(brands)}
          disabled={!brands.trim()}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </Button>
      </motion.div>
    </motion.div>
  );
}; 