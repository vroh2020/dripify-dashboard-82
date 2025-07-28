import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep = ({ onNext }: WelcomeStepProps) => {
  const handleAnonymous = async () => {
    console.log('👤 Continue without Apple clicked');
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      console.log('✅ Anonymous sign-in successful');
      onNext();
    } catch (err) {
      console.error('❌ Anonymous sign-in failed:', err);
      // Optionally show a toast or error UI here
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="text-center"
            >
              <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tighter">
                Welcome to
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                  OutfitGrader AI
                </span>
              </h1>
              <p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto text-white/70">
                Get instant, AI-powered feedback on your style.
              </p>
            </motion.div>
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
                  {/* Icon or logo here */}
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
      {/* Button Area - Only Continue without Apple */}
      <div className="flex-shrink-0 space-y-4 px-6 pb-6">
        <Button
          onClick={handleAnonymous}
          className="w-full bg-gray-800 text-white h-16 text-lg font-semibold rounded-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center shadow-xl border-2 border-white/10"
        >
          <span role="img" aria-label="guest">👤</span> Continue without Apple
        </Button>
      </div>
    </motion.div>
  );
};
