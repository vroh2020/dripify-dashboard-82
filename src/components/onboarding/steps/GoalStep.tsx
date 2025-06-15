
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { goalOptions } from "../data/constants";

interface GoalStepProps {
  onGoalSelect: (goal: string) => void;
}

export const GoalStep = ({ onGoalSelect }: GoalStepProps) => {
  return (
    <motion.div
      key="goal"
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
          🎯
        </motion.div>
        <div className="space-y-4 text-center">
          <h2 className="text-4xl font-bold text-white">What's your main goal?</h2>
          <p className="text-white/70 text-xl">Let us know what you want to achieve</p>
        </div>
      </div>
      
      {/* Button List Area - Fixed bottom */}
      <div className="grid grid-cols-1 gap-4 px-8 pb-8">
        {goalOptions.map((goal, index) => (
          <motion.div
            key={goal.id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.15, duration: 0.5 }}
          >
            <Button
              onClick={() => onGoalSelect(goal.id)}
              className="w-full h-18 bg-white/10 border-2 border-white/20 text-white hover:bg-gradient-to-r hover:from-orange-500/30 hover:to-orange-400/30 hover:border-orange-500/70 hover:scale-105 transition-all duration-300 rounded-2xl backdrop-blur-sm flex items-center justify-start p-6"
            >
              <span className="text-3xl mr-4">{goal.emoji}</span>
              <div className="text-left">
                <div className="font-bold text-xl">{goal.title}</div>
                <div className="text-white/70 text-base">{goal.description}</div>
              </div>
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
