
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
      className="flex flex-col justify-between h-full text-center"
    >
      {/* Content Area */}
      <div className="flex-1 flex flex-col justify-center space-y-4 py-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-4xl mb-2"
        >
          🎂
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">What's your age?</h2>
          <p className="text-white/70 text-sm">Help us personalize your style experience</p>
        </div>
      </div>

      {/* Buttons Grid - Fixed bottom positioning */}
      <div className="grid grid-cols-2 gap-2 pb-2 flex-shrink-0">
        {ageOptions.map((age, index) => (
          <motion.div
            key={age}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
          >
            <Button
              onClick={() => onAgeSelect(age)}
              className="w-full h-11 text-sm font-bold bg-white/10 border-2 border-white/20 text-white hover:bg-gradient-to-r hover:from-orange-500/30 hover:to-orange-400/30 hover:border-orange-500/70 hover:scale-105 transition-all duration-300 rounded-xl backdrop-blur-sm"
            >
              {age}
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
