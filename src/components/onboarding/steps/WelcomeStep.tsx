
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
      className="h-full flex flex-col"
    >
      {/* Content Area - Centered */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
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
          className="text-7xl mb-8"
        >
          🧑‍🎤
        </motion.div>
        
        <div className="space-y-6 text-center">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-orange-400 to-orange-500 text-transparent bg-clip-text">
              Drip Max
            </span>
          </h1>
          <p className="text-white/80 text-xl leading-relaxed">
            Your AI stylist is here!<br />
            Get instant style ratings & become the best dressed you.
          </p>
        </div>

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 rounded-2xl p-6 border border-white/10 w-full max-w-sm mt-8"
        >
          <div className="bg-white/5 rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Star className="text-white text-xl" />
              </div>
              <div className="text-left">
                <div className="text-white font-semibold text-xl">Your Rating</div>
                <div className="text-white/60">Overall Style</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white">86</div>
              <div className="w-12 h-2 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full"></div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Button Area - Fixed bottom */}
      <div className="space-y-4 px-8 pb-8">
        <Button
          onClick={handleAppleClick}
          className="w-full bg-black hover:bg-gray-900 text-white h-16 text-lg font-semibold rounded-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center shadow-xl"
        >
          <Apple className="mr-3 h-6 w-6" />
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
          className="w-full bg-white/10 border-2 border-white/20 text-white hover:bg-white/20 hover:border-white/30 h-16 text-lg font-semibold rounded-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm"
        >
          Continue with Email
        </Button>
      </div>
    </motion.div>
  );
};
