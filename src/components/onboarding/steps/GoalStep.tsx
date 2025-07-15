import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { goalOptions } from "../data/constants";
import { useEffect } from "react";

interface GoalStepProps {
  onGoalSelect: (goal: string) => void;
}

export const GoalStep = ({ onGoalSelect }: GoalStepProps) => {
  useEffect(() => {
    console.log('🎯 GoalStep RENDERED at:', new Date().toISOString());
    console.log('🎯 GoalStep onGoalSelect function:', typeof onGoalSelect);
  }, [onGoalSelect]);

  return (
    <motion.div
      key="goal"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="h-full flex flex-col"
    >
      {/* Content Area - Centered with proper iPhone spacing */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-8 min-h-0">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-6xl mb-6"
        >
          🎯
        </motion.div>
        <div className="space-y-3 text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white px-4">What's your main goal?</h2>
          <p className="text-white/70 text-lg px-4">Let us know what you want to achieve</p>
        </div>
      </div>
      
      {/* Button List Area - Fixed bottom with proper iPhone safe area */}
      <div className="px-6 pb-safe-offset-8 space-y-3">
        {goalOptions.map((goal, index) => (
          <motion.div
            key={goal.id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.15, duration: 0.5 }}
          >
            <Button
              onClick={() => {
                console.log('🎯 GoalStep Button CLICKED:', goal.id, 'at:', new Date().toISOString());
                onGoalSelect(goal.id);
              }}
              className="w-full min-h-[72px] bg-white/10 border-2 border-white/20 text-white hover:bg-gradient-to-r hover:from-orange-500/30 hover:to-orange-400/30 hover:border-orange-500/70 hover:scale-105 transition-all duration-300 rounded-2xl backdrop-blur-sm flex items-center justify-start p-4"
            >
              <span className="text-2xl mr-4 flex-shrink-0">{goal.emoji}</span>
              <div className="text-left flex-1 min-w-0">
                <div className="font-bold text-lg leading-tight">{goal.title}</div>
                <div className="text-white/70 text-sm leading-tight">{goal.description}</div>
              </div>
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
