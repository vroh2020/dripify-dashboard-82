
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ageOptions } from "../data/constants";

interface AgeStepProps {
  onAgeSelect: (age: string) => void;
}

export const AgeStep = ({ onAgeSelect }: AgeStepProps) => {
  return (
    <motion.div
      key="age"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="h-full flex flex-col"
    >
      {/* Content Area - Centered */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-7xl mb-8"
        >
          🎂
        </motion.div>
        <div className="space-y-4 text-center">
          <h2 className="text-4xl font-bold text-white">What's your age?</h2>
          <p className="text-white/70 text-xl">Help us personalize your style experience</p>
        </div>
      </div>

      {/* Button Grid Area - Fixed bottom */}
      <div className="grid grid-cols-2 gap-4 px-8 pb-8">
        {ageOptions.map((age, index) => (
          <motion.div
            key={age}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
          >
            <Button
              onClick={() => onAgeSelect(age)}
              className="w-full h-16 text-lg font-bold bg-white/10 border-2 border-white/20 text-white hover:bg-gradient-to-r hover:from-orange-500/30 hover:to-orange-400/30 hover:border-orange-500/70 hover:scale-105 transition-all duration-300 rounded-2xl backdrop-blur-sm"
            >
              {age}
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
