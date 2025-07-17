import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface HeardAboutStepProps {
  onNext: (answer: string) => void;
}

const options = [
  'Instagram', 'Facebook', 'TikTok', 'Youtube', 'Google', 'TV', 'Friend or family'
];

export const HeardAboutStep = ({ onNext }: HeardAboutStepProps) => {
  return (
    <motion.div
      key="heard-about"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="h-full flex flex-col"
    >
      {/* Content Area - Centered */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-8">
        <div className="space-y-6 text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-white mb-4">Where did you hear about Dripify AI?</h2>
            <p className="text-white/70 text-base leading-relaxed max-w-sm">
              Help us understand how you discovered our style AI
            </p>
          </motion.div>
        </div>

        {/* Options */}
        <div className="w-full max-w-sm space-y-3">
          {options.map((option, index) => (
            <motion.div
              key={option}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
            >
              <Button
                className="w-full h-14 text-lg font-medium rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white hover:scale-105 transition-all duration-200"
                onClick={() => onNext(option)}
              >
                {option}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}; 