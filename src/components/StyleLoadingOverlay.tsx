
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

interface StyleLoadingOverlayProps {
  isAnalyzing: boolean;
  onTimeout?: () => void;
  timeoutDuration?: number;
}

const loadingMessages = [
  { emoji: "👁️", text: "Analyzing your outfit..." },
  { emoji: "🧠", text: "AI is thinking..." },
  { emoji: "🎨", text: "Checking color harmony..." },
  { emoji: "👗", text: "Evaluating style elements..." },
  { emoji: "✨", text: "Creating your style profile..." },
  { emoji: "📊", text: "Calculating your drip score..." }
];

const dripFacts = [
  "The color wheel was invented in 1666 by Sir Isaac Newton",
  "Wearing red can actually make you more confident",
  "The 'rule of three' suggests limiting outfits to 3 colors max",
  "Your personal style should reflect your personality",
  "Good fit is more important than expensive brands"
];

export const StyleLoadingOverlay = ({ 
  isAnalyzing, 
  onTimeout, 
  timeoutDuration = 60000  // Reduced from 90s to 60s
}: StyleLoadingOverlayProps) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showDripFact, setShowDripFact] = useState(false);
  const [dripFactIndex, setDripFactIndex] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  // Message rotation
  useEffect(() => {
    if (!isAnalyzing) return;
    
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 4000); // Faster rotation for better UX
    
    return () => clearInterval(messageInterval);
  }, [isAnalyzing]);

  // Progress bar simulation and timeout handling
  useEffect(() => {
    if (!isAnalyzing) return;
    
    let progressInterval: NodeJS.Timeout;
    let timeoutTimer: NodeJS.Timeout;
    let dripFactTimer: NodeJS.Timeout;

    // Show drip fact after 20 seconds instead of 30
    dripFactTimer = setTimeout(() => {
      if (isAnalyzing && !hasTimedOut) {
        setDripFactIndex(Math.floor(Math.random() * dripFacts.length));
        setShowDripFact(true);
        setTimeout(() => setShowDripFact(false), 6000); // Show for 6 seconds
      }
    }, 20000);
    
    // Progress bar update - more realistic progression
    progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 90) {
          // Faster initial progress, then slower
          const increment = prev < 30 ? 1.2 : prev < 60 ? 0.8 : 0.3;
          return Math.min(prev + increment, 90);
        }
        return prev;
      });
      
      setTimeElapsed((prev) => prev + 200);
    }, 200);
    
    // Timeout handling with user feedback
    timeoutTimer = setTimeout(() => {
      if (isAnalyzing && !hasTimedOut) {
        console.warn('⚠️ StyleLoadingOverlay timeout reached');
        setHasTimedOut(true);
        setProgress(100);
        
        // Give user a moment to see completion before calling timeout
        setTimeout(() => {
          if (onTimeout) {
            onTimeout();
          }
        }, 1500);
      }
    }, timeoutDuration);
    
    return () => {
      clearInterval(progressInterval);
      clearTimeout(timeoutTimer);
      clearTimeout(dripFactTimer);
    };
  }, [isAnalyzing, onTimeout, timeoutDuration, hasTimedOut]);

  // Reset state when analysis stops
  useEffect(() => {
    if (!isAnalyzing) {
      setProgress(0);
      setTimeElapsed(0);
      setShowDripFact(false);
      setHasTimedOut(false);
      setCurrentMessageIndex(0);
    }
  }, [isAnalyzing]);

  if (!isAnalyzing) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-lg"
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
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
        </div>
        
        {/* Loading messages with timeout handling */}
        <div className="min-h-[80px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {hasTimedOut ? (
              <motion.div
                key="timeout"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center"
              >
                <span className="text-2xl mb-2">⏰</span>
                <p className="text-lg font-medium text-white">Analysis complete!</p>
                <p className="text-sm text-white/60 mt-1">Processing results...</p>
              </motion.div>
            ) : (
              <motion.div
                key={currentMessageIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center"
              >
                <span className="text-2xl mb-2">{loadingMessages[currentMessageIndex].emoji}</span>
                <p className="text-lg font-medium text-white">{loadingMessages[currentMessageIndex].text}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Progress bar with enhanced styling */}
        <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full rounded-full transition-all duration-300 ${
              hasTimedOut 
                ? 'bg-gradient-to-r from-green-500 to-green-400' 
                : 'bg-gradient-to-r from-purple-500 to-pink-500'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
            animate={{ 
              boxShadow: hasTimedOut 
                ? ["0 0 10px #10b981", "0 0 20px #10b981", "0 0 10px #10b981"]
                : ["0 0 10px #9b87f5", "0 0 20px #9b87f5", "0 0 10px #9b87f5"] 
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-400">
          <span>{hasTimedOut ? 'Finalizing...' : 'AI style analysis...'}</span>
          <span>{Math.min(Math.round(progress), 100)}%</span>
        </div>
        
        {/* Drip fact with improved timing */}
        <AnimatePresence>
          {showDripFact && !hasTimedOut && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mt-6 p-4 rounded-lg bg-[#1A1F2C]/80 border border-[#403E43]"
            >
              <h4 className="text-sm font-bold text-[#9b87f5] mb-2">✨ STYLE TIP ✨</h4>
              <p className="text-sm text-white/80">{dripFacts[dripFactIndex]}</p>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Emergency timeout info */}
        {timeElapsed > 45000 && !hasTimedOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20"
          >
            <p className="text-xs text-orange-200">
              Taking longer than usual? Don't worry, our AI is working hard on your analysis!
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
