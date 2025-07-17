import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep = ({ onNext }: WelcomeStepProps) => {
  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="h-full flex flex-col"
    >
      {/* Content Area - Centered */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-8">
        <motion.div
          animate={{ 
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mb-8"
        >
          <Sparkles className="w-16 h-16 text-orange-400 mx-auto" />
        </motion.div>
        
        <div className="space-y-6 text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tighter mb-4">
              Welcome to
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-purple-500">
                Dripify AI
              </span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-md mx-auto">
              Get instant, AI-powered feedback on your style and elevate your drip game.
            </p>
          </motion.div>
        </div>

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 rounded-2xl p-6 border border-white/10 w-full max-w-sm mb-8"
        >
          <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Sparkles className="text-white text-lg" />
              </div>
              <div className="text-left">
                <div className="text-white font-semibold text-lg">Your Style Rating</div>
                <div className="text-white/60 text-sm">AI-Powered Analysis</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">86</div>
              <div className="w-10 h-1.5 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full"></div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Button Area - Fixed bottom */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        className="px-6 pb-8"
      >
        <Button
          onClick={onNext}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl"
        >
          <Sparkles className="mr-3 h-5 w-5" />
          Let's get started
        </Button>
      </motion.div>
    </motion.div>
  );
};
