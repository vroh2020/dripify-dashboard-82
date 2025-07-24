import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { handleAppleSignIn } from "../utils/auth";
import { supabase } from "@/integrations/supabase/client";

interface NewWelcomeStepProps {
  onNext: () => void;
}

export const NewWelcomeStep = ({ onNext }: NewWelcomeStepProps) => {
  const handleApple = async () => {
    try {
      const success = await handleAppleSignIn();
      if (success) onNext();
    } catch {}
  };
  const handleAnonymous = async () => {
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (!error) onNext();
    } catch {}
  };
  return (
    <motion.div key="welcome" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.6, ease: "easeOut" }} className="min-h-full flex flex-col">
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-8 min-h-0">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center">
          <motion.div animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="text-6xl mb-6">🧑‍🎤</motion.div>
          <div className="space-y-4 text-center mb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }} className="text-center">
              <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tighter">Welcome to<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">Dripify AI</span></h1>
              <p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto text-white/70">Your personalized style assistant.</p>
            </motion.div>
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 space-y-4 px-6 pb-6">
        <Button onClick={handleApple} className="w-full bg-black text-white h-16 text-lg font-semibold rounded-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center shadow-xl border-2 border-white/10"><span role="img" aria-label="apple">🍎</span> Continue with Apple</Button>
        <Button onClick={handleAnonymous} className="w-full bg-gray-800 text-white h-16 text-lg font-semibold rounded-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center shadow-xl border-2 border-white/10"><span role="img" aria-label="guest">👤</span> Continue without Apple</Button>
      </div>
    </motion.div>
  );
}; 