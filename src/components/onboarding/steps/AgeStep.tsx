
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
      className="text-center space-y-8 flex flex-col justify-center h-full"
    >
      <div className="space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-6xl mb-4"
        >
          🎂
        </motion.div>
        <h2 className="text-3xl font-bold text-white">What's your age?</h2>
        <p className="text-white/70 text-lg">Help us personalize your style experience</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {ageOptions.map((age, index) => (
          <motion.div
            key={age}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
          >
            <Button
              onClick={() => onAgeSelect(age)}
              className="w-full h-16 text-xl font-bold bg-white/10 border-2 border-white/20 text-white hover:bg-gradient-to-r hover:from-orange-500/30 hover:to-orange-400/30 hover:border-orange-500/70 hover:scale-105 transition-all duration-300 rounded-2xl backdrop-blur-sm"
            >
              {age}
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
