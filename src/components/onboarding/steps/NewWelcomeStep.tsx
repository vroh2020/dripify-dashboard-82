import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface NewWelcomeStepProps {
  onNext: () => void;
}

export const NewWelcomeStep = ({ onNext }: NewWelcomeStepProps) => {
  const handleAnonymous = async () => {
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (!error) onNext();
    } catch {}
  };
  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"
    >
      <div className="w-full max-w-md mx-auto flex flex-col items-center px-6 py-12 bg-black/10 rounded-2xl shadow-xl">
        <div className="text-6xl mb-6">🧑‍🎤</div>
        <h1 className="text-5xl font-extrabold text-white text-center mb-2">
          Welcome to <span className="text-pink-400">OutfitGrader AI</span>
        </h1>
        <p className="mt-2 text-lg text-white/70 text-center mb-8">
          Your personalized style assistant.
        </p>
        <Button
          onClick={handleAnonymous}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white h-16 text-lg font-semibold rounded-xl shadow-lg hover:scale-105 transition"
        >
          <span role="img" aria-label="guest">👤</span> Continue
        </Button>
      </div>
    </motion.div>
  );
}; 