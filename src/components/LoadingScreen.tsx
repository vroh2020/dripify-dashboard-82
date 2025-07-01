import { motion } from "framer-motion";
import { memo, useState, useEffect } from "react";

interface LoadingScreenProps {
  message?: string;
  showTimeout?: boolean;
  onTimeout?: () => void;
  timeoutDuration?: number;
}

export const LoadingScreen = memo(({ 
  message = "Loading...", 
  showTimeout = true,
  onTimeout,
  timeoutDuration = 10000
}: LoadingScreenProps) => {
  const [showTimeoutOption, setShowTimeoutOption] = useState(false);
  const [dots, setDots] = useState("");

  // Animated dots for loading message
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Timeout handler
  useEffect(() => {
    if (!showTimeout) return;

    const timeout = setTimeout(() => {
      setShowTimeoutOption(true);
    }, timeoutDuration);

    return () => clearTimeout(timeout);
  }, [showTimeout, timeoutDuration]);

  const handleTimeoutAction = () => {
    if (onTimeout) {
      onTimeout();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#1A1F2C] via-[#2C1F3D] to-[#1A1F2C] flex items-center justify-center p-4">
      <motion.div 
        className="text-center space-y-6 max-w-sm w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Loading spinner */}
        <motion.div
          className="w-12 h-12 border-3 border-orange-400 border-t-transparent rounded-full mx-auto"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Loading message */}
        <motion.div 
          className="space-y-2"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <p className="text-white text-lg font-medium">
            {message}{dots}
          </p>
          <p className="text-white/50 text-sm">
            Please wait while we set things up
          </p>
        </motion.div>

        {/* Progress indicator */}
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ 
              duration: timeoutDuration / 1000,
              ease: "easeInOut" 
            }}
          />
        </div>

        {/* Timeout option */}
        {showTimeoutOption && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3"
          >
            <p className="text-white/80 text-sm">
              Taking longer than expected?
            </p>
            <button
              onClick={handleTimeoutAction}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Refresh & Try Again
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
});
