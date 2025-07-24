import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface StylePreferencesStepProps {
  onNext: (preferences: string[]) => void;
}

const styleOptions = [
  { id: 'casual', label: 'Casual', emoji: '👕' },
  { id: 'street', label: 'Street', emoji: '🧢' },
  { id: 'formal', label: 'Formal', emoji: '👔' },
  { id: 'sporty', label: 'Sporty', emoji: '👟' },
  { id: 'vintage', label: 'Vintage', emoji: '👘' },
  { id: 'futuristic', label: 'Futuristic', emoji: '🚀' }
];

export const StylePreferencesStep = ({ onNext }: StylePreferencesStepProps) => {
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const toggleStyle = (styleId: string) => {
    setSelectedStyles(prev => prev.includes(styleId) ? prev.filter(id => id !== styleId) : [...prev, styleId]);
  };
  const handleNext = () => {
    if (selectedStyles.length > 0) onNext(selectedStyles);
  };
  return (
    <motion.div key="style-preferences" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.6, ease: "easeOut" }} className="h-full flex flex-col">
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200 }} className="text-7xl mb-8">✨</motion.div>
        <div className="space-y-4 text-center mb-8">
          <h2 className="text-4xl font-bold text-white">Which styles do you love?</h2>
          <p className="text-white/70 text-xl">Select all that apply</p>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-8">
          {styleOptions.map((style, index) => (
            <motion.div key={style.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.1, duration: 0.4 }}>
              <Button onClick={() => toggleStyle(style.id)} className={`w-full h-20 text-lg font-bold border-2 transition-all duration-300 rounded-2xl backdrop-blur-sm flex flex-col items-center justify-center gap-2 ${selectedStyles.includes(style.id) ? 'bg-gradient-to-r from-orange-500/50 to-orange-400/50 border-orange-500 text-white scale-105' : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/40 hover:scale-105'}`}>
                <span className="text-2xl">{style.emoji}</span>
                <span className="text-sm">{style.label}</span>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="px-8 pb-8">
        <Button onClick={handleNext} disabled={selectedStyles.length === 0} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl disabled:opacity-50 disabled:hover:scale-100">Next ({selectedStyles.length} selected)</Button>
      </div>
    </motion.div>
  );
}; 