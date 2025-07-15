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
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 px-4 py-8"
    >
      <div className="w-full max-w-lg mx-auto flex flex-col items-center bg-black/70 rounded-3xl shadow-2xl p-8 border border-white/10">
        <div className="flex flex-col items-center mb-6">
          <span className="text-5xl mb-2">🎯</span>
          <h2 className="text-3xl font-extrabold text-white text-center mb-2">What's your main goal?</h2>
          <p className="text-white/70 text-lg text-center mb-2">Let us know what you want to achieve</p>
        </div>
        <div className="w-full grid grid-cols-1 gap-4 mb-2">
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
                className="w-full h-20 bg-white/10 border-2 border-white/20 text-white hover:bg-gradient-to-r hover:from-orange-500/30 hover:to-orange-400/30 hover:border-orange-500/70 hover:scale-105 transition-all duration-300 rounded-2xl backdrop-blur-sm flex items-center justify-start p-6 text-left"
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
        <div className="text-white/60 text-xs text-center mt-4">Most successful members choose multiple goals</div>
      </div>
    </motion.div>
  );
};
