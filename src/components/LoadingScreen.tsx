import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

interface LoadingScreenProps {
  message?: string;
  timeout?: number;
  onTimeout?: () => void;
}

export const LoadingScreen = ({ 
  message = "Loading...", 
  timeout = 8000,
  onTimeout 
}: LoadingScreenProps) => {
  const [dots, setDots] = useState(1);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => prev === 3 ? 1 : prev + 1);
    }, 500);

    const timeoutTimer = setTimeout(() => {
      setHasTimedOut(true);
      if (onTimeout) {
        onTimeout();
      }
    }, timeout);

    return () => {
      clearInterval(dotsInterval);
      clearTimeout(timeoutTimer);
    };
  }, [timeout, onTimeout]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center"
      >
        <motion.div
          animate={{ 
            rotate: [0, 360],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mb-6"
        >
          <Sparkles className="w-12 h-12 text-orange-400 mx-auto" />
        </motion.div>
        
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-2xl font-bold text-white mb-4"
        >
          Dripify AI
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-white/70 text-lg mb-8"
        >
          {hasTimedOut ? "Almost ready..." : message}
          {!hasTimedOut && ".".repeat(dots)}
        </motion.p>
        
        {/* Progress indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="w-48 h-1 bg-white/10 rounded-full mx-auto overflow-hidden"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-400"
            animate={{ 
              x: ["-100%", "100%"],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
        
        {hasTimedOut && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <button
              onClick={() => window.location.reload()}
              className="text-orange-400 hover:text-orange-300 text-sm underline"
            >
              Tap to refresh if stuck
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}; 