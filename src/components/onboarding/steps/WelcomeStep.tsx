import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Apple, Star, LogOut } from "lucide-react";
import { handleAppleSignIn } from "../utils/auth";
import { supabase } from "@/integrations/supabase/client";

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep = ({ onNext }: WelcomeStepProps) => {
  const handleAppleClick = async () => {
    try {
      console.log('🍎 Starting Apple Sign-In...');
      const success = await handleAppleSignIn();
      
      if (success) {
        console.log('✅ Apple Sign-In initiated successfully');
        // For web OAuth, the success handling will happen via auth state change
        // No need to call onNext() here as the redirect will handle it
      } else {
        console.error('❌ Apple Sign-In failed to initiate');
      }
    } catch (error) {
      console.error('💥 Apple Sign-In error:', error);
    }
  };

  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-full flex flex-col"
    >
      {/* Content Area - Scrollable */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-8 min-h-0">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center">
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
            className="text-6xl mb-6"
          >
            🧑‍🎤
          </motion.div>
          
          <div className="space-y-4 text-center mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-orange-400 to-orange-500 text-transparent bg-clip-text">
                Drip Check
              </span>
            </h1>
            <p className="text-white/70 max-w-sm mt-4 text-lg">
              Your AI stylist is here!<br />
              Get instant style ratings & become the best dressed you.
            </p>
          </div>

          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 rounded-2xl p-4 border border-white/10 w-full mb-8"
          >
            <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Star className="text-white text-lg" />
                </div>
                <div className="text-left">
                  <div className="text-white font-semibold text-lg">Your Rating</div>
                  <div className="text-white/60 text-sm">Overall Style</div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">86</div>
                <div className="w-10 h-1.5 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full"></div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Button Area - Apple Sign In + Debug */}
      <div className="flex-shrink-0 space-y-4 px-6 pb-6">
        <Button
          onClick={handleAppleClick}
          className="w-full bg-black hover:bg-gray-900 text-white h-16 text-lg font-semibold rounded-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center shadow-xl border-2 border-white/10"
        >
          <Apple className="mr-3 h-6 w-6" />
          Continue with Apple
        </Button>
        
        <p className="text-white/60 text-sm text-center leading-relaxed">
          Sign in securely with your Apple ID.<br />
          We'll create your personalized style profile.
        </p>
      </div>
    </motion.div>
  );
};
