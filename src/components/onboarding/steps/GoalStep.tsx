
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
      className="flex flex-col justify-between h-full text-center"
    >
      <div className="flex-1 flex flex-col justify-center space-y-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-5xl mb-2"
        >
          🎯
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">What's your main goal?</h2>
          <p className="text-white/70 text-base">Let us know what you want to achieve</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-3 pb-4">
        {goalOptions.map((goal, index) => (
          <motion.div
            key={goal.id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.15, duration: 0.5 }}
          >
            <Button
              onClick={() => onGoalSelect(goal.id)}
              className="w-full h-16 bg-white/10 border-2 border-white/20 text-white hover:bg-gradient-to-r hover:from-orange-500/30 hover:to-orange-400/30 hover:border-orange-500/70 hover:scale-105 transition-all duration-300 rounded-xl backdrop-blur-sm flex items-center justify-start p-4"
            >
              <span className="text-2xl mr-3">{goal.emoji}</span>
              <div className="text-left">
                <div className="font-bold text-base">{goal.title}</div>
                <div className="text-white/70 text-sm">{goal.description}</div>
              </div>
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
