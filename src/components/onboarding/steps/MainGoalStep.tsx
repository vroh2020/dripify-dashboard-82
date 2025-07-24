import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface MainGoalStepProps {
  onSelect: (goal: string) => void;
}

const goalOptions = [
  { id: 'comfort', label: 'Comfort', emoji: '😌', description: 'Prioritize comfort and ease' },
  { id: 'trend-setting', label: 'Trend-setting', emoji: '🔥', description: 'Stay ahead of fashion trends' },
  { id: 'professional', label: 'Professional', emoji: '💼', description: 'Look polished for work' },
  { id: 'athletic', label: 'Athletic', emoji: '🏃', description: 'Focus on active lifestyle' }
];

export const MainGoalStep = ({ onSelect }: MainGoalStepProps) => (
  <motion.div key="main-goal" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.6, ease: "easeOut" }} className="h-full flex flex-col">
    <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200 }} className="text-7xl mb-8">🎯</motion.div>
      <div className="space-y-4 text-center">
        <h2 className="text-4xl font-bold text-white">What is your style goal?</h2>
        <p className="text-white/70 text-xl">Choose your primary focus</p>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4 px-8 pb-8">
      {goalOptions.map((option, index) => (
        <motion.div key={option.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1, duration: 0.4 }}>
          <Button onClick={() => onSelect(option.id)} className="w-full h-20 bg-white/10 border-2 border-white/20 text-white hover:bg-gradient-to-r hover:from-orange-500/30 hover:to-orange-400/30 hover:border-orange-500/70 hover:scale-105 transition-all duration-300 rounded-2xl backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-4">
            <span className="text-2xl">{option.emoji}</span>
            <div className="text-center">
              <div className="font-bold text-lg">{option.label}</div>
              <div className="text-white/70 text-sm">{option.description}</div>
            </div>
          </Button>
        </motion.div>
      ))}
    </div>
  </motion.div>
); 