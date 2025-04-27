
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

interface StyleLoadingOverlayProps {
  isAnalyzing: boolean;
  onTimeout?: () => void;
  timeoutDuration?: number;
}

// More concise loading messages for faster display
const loadingMessages = [
  { text: "Scanning your style... 👖", emoji: "👕" },
  { text: "Analyzing color coordination... 🎨", emoji: "🌈" },
  { text: "Checking fit and proportion... 📏", emoji: "✂️" },
  { text: "Evaluating style coherence... 💫", emoji: "✨" },
  { text: "Assessing accessories... ✨", emoji: "👜" },
  { text: "Calculating overall score... 📊", emoji: "🔢" },
];

// Simplified drip facts
const dripFacts = [
  "The term 'drip' originated in Atlanta's hip-hop scene in the early 2010s",
  "Blue jeans were invented in 1871 by Jacob Davis and Levi Strauss",
  "The Nike swoosh logo was designed for just $35 in 1971",
  "Coco Chanel introduced the 'little black dress' in the 1920s"
];

export const StyleLoadingOverlay = ({ 
  isAnalyzing, 
  onTimeout, 
  timeoutDuration = 45000 // Default reduced to 45 seconds
}: StyleLoadingOverlayProps) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showDripFact, setShowDripFact] = useState(false);
  const [dripFactIndex, setDripFactIndex] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Faster message rotation
  useEffect(() => {
    if (!isAnalyzing) return;
    
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 3000); // 3 seconds instead of 5
    
    return () => clearInterval(messageInterval);
  }, [isAnalyzing]);

  // Progress bar simulation - faster progress
  useEffect(() => {
    if (!isAnalyzing) return;
    
    // Show drip fact around 10 seconds in
    const dripFactTimer = setTimeout(() => {
      setDripFactIndex(Math.floor(Math.random() * dripFacts.length));
      setShowDripFact(true);
      setTimeout(() => setShowDripFact(false), 6000); // Show for 6 seconds
    }, 10000); // Show earlier at 10 seconds
    
    // Progress bar update - faster progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        // Cap at 95% to show it's still "thinking"
        if (prev < 95) {
          // Make progress faster overall
          const increment = prev < 60 ? 1.2 : 0.8; // Faster increments
          return prev + increment;
        }
        return prev;
      });
      
      setTimeElapsed((prev) => prev + 100);
    }, 100);
    
    // Timeout handling
    const timeoutTimer = setTimeout(() => {
      if (onTimeout) onTimeout();
    }, timeoutDuration);
    
    return () => {
      clearInterval(progressInterval);
      clearTimeout(timeoutTimer);
      clearTimeout(dripFactTimer);
    };
  }, [isAnalyzing, onTimeout, timeoutDuration]);

  // Reset when analysis stops
  useEffect(() => {
    if (!isAnalyzing) {
      setProgress(0);
      setTimeElapsed(0);
      setShowDripFact(false);
    }
  }, [isAnalyzing]);

  if (!isAnalyzing) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-lg"
    >
      <div className="w-full max-w-md p-8 space-y-8 text-center">
        {/* Drip loading animation */}
        <div className="relative flex justify-center mb-8">
          <div className="absolute top-0 w-20 h-20 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full opacity-20 animate-ping" />
          <div className="relative z-10">
            <Sparkles className="w-16 h-16 text-pink-500 animate-pulse" />
          </div>
          <motion.div 
            className="absolute -inset-8"
            animate={{ 
              rotate: [0, 360],
              background: [
                "radial-gradient(circle, rgba(155,135,245,0.4) 0%, rgba(155,135,245,0) 50%)",
                "radial-gradient(circle, rgba(214,188,250,0.4) 0%, rgba(214,188,250,0) 50%)",
                "radial-gradient(circle, rgba(155,135,245,0.4) 0%, rgba(155,135,245,0) 50%)"
              ]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }} // Faster animation
          />
        </div>
        
        {/* Loading messages */}
        <div className="h-24 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMessageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }} // Faster transitions
              className="flex flex-col items-center"
            >
              <span className="text-2xl mb-2">{loadingMessages[currentMessageIndex].emoji}</span>
              <p className="text-lg font-medium text-white">{loadingMessages[currentMessageIndex].text}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Heat meter - Slightly faster progress */}
        <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
            style={{ width: `${progress}%` }}
            animate={{ boxShadow: ["0 0 10px #9b87f5", "0 0 20px #9b87f5", "0 0 10px #9b87f5"] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>AI style analysis...</span>
          <span>{Math.min(Math.round(progress), 99)}%</span>
        </div>
        
        {/* Drip fact */}
        <AnimatePresence>
          {showDripFact && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mt-6 p-4 rounded-lg bg-[#1A1F2C]/80 border border-[#403E43]"
            >
              <h4 className="text-sm font-bold text-[#9b87f5] mb-2">✨ STYLE FACT ✨</h4>
              <p className="text-sm text-white/80">{dripFacts[dripFactIndex]}</p>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Timeout warning - earlier warning */}
        {timeElapsed > 35000 && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-amber-400 text-sm mt-4"
          >
            This is taking longer than usual. Hang tight...
          </motion.p>
        )}
      </div>
    </motion.div>
  );
};
