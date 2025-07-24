import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface FitPreferenceStepProps {
  onSelect: (fit: string) => void;
}

const fitOptions = [
  { id: 'loose', label: 'Loose', emoji: '🧥', description: 'Relaxed and comfortable' },
  { id: 'regular', label: 'Regular', emoji: '👔', description: 'Classic standard fit' },
  { id: 'tight', label: 'Tight', emoji: '🏃', description: 'Fitted and form-hugging' }
];

export const FitPreferenceStep = ({ onSelect }: FitPreferenceStepProps) => (
  <motion.div key="fit-preference" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.6, ease: "easeOut" }} className="h-full flex flex-col">
    <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200 }} className="text-7xl mb-8">📏</motion.div>
      <div className="space-y-4 text-center">
        <h2 className="text-4xl font-bold text-white">Loose, regular, or tight?</h2>
        <p className="text-white/70 text-xl">What's your preferred fit?</p>
      </div>
    </div>
    <div className="space-y-4 px-8 pb-8">
      {fitOptions.map((option, index) => (
        <motion.div key={option.id} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.15, duration: 0.5 }}>
          <Button onClick={() => onSelect(option.id)} className="w-full h-20 bg-white/10 border-2 border-white/20 text-white hover:bg-gradient-to-r hover:from-orange-500/30 hover:to-orange-400/30 hover:border-orange-500/70 hover:scale-105 transition-all duration-300 rounded-2xl backdrop-blur-sm flex items-center justify-start p-6 text-left">
            <span className="text-3xl mr-4">{option.emoji}</span>
            <div className="text-left">
              <div className="font-bold text-xl">{option.label}</div>
              <div className="text-white/70 text-base">{option.description}</div>
            </div>
          </Button>
        </motion.div>
      ))}
    </div>
  </motion.div>
); 