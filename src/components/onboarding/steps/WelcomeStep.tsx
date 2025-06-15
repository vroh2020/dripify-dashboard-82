
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Apple, Star } from "lucide-react";
import { handleAppleSignIn, handleContinueWithEmail } from "../utils/auth";

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep = ({ onNext }: WelcomeStepProps) => {
  const handleAppleClick = async () => {
    await handleAppleSignIn();
    onNext();
  };

  const handleEmailClick = async () => {
    await handleContinueWithEmail();
    onNext();
  };

  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col justify-between h-full text-center"
    >
      <div className="flex-1 flex flex-col justify-center space-y-6">
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
          className="text-6xl mb-2"
        >
          🧑‍🎤
        </motion.div>
        
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-white leading-tight">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-orange-400 to-orange-500 text-transparent bg-clip-text">
              Drip Max
            </span>
          </h1>
          <p className="text-white/80 text-base leading-relaxed px-2">
            Your AI stylist is here!<br />
            Get instant style ratings & become the best dressed you.
          </p>
        </div>

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 rounded-xl p-4 border border-white/10 mx-2"
        >
          <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Star className="text-white text-lg" />
              </div>
              <div className="text-left">
                <div className="text-white font-semibold text-base">Your Rating</div>
                <div className="text-white/60 text-sm">Overall Style</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">86</div>
              <div className="w-12 h-2 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full"></div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="space-y-3 pb-2">
        <Button
          onClick={handleAppleClick}
          className="w-full bg-black hover:bg-gray-900 text-white h-12 text-base font-semibold rounded-xl transition-all duration-300 hover:scale-105 flex items-center justify-center shadow-xl"
        >
          <Apple className="mr-2 h-5 w-5" />
          Continue with Apple
        </Button>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/20"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-black/40 text-white/60 font-medium">or</span>
          </div>
        </div>
        
        <Button
          onClick={handleEmailClick}
          className="w-full bg-white/10 border-2 border-white/20 text-white hover:bg-white/20 hover:border-white/30 h-12 text-base font-semibold rounded-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm"
        >
          Continue with Email
        </Button>
      </div>
    </motion.div>
  );
};
