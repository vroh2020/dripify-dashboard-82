import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Logger } from "@/utils/logger";
import { useToast } from "@/hooks/use-toast";

interface WelcomeHeroStepProps {
  onNext: () => void;
  onUserCreated?: (userId: string) => void;
}

export const WelcomeHeroStep = ({ onNext, onUserCreated }: WelcomeHeroStepProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentScreen, setCurrentScreen] = useState(0);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const screens = [
    {
      title: "Discover new fits and dress better",
      image: "/lovable-uploads/outfitgrader-ai-2.png"
    },
    {
      title: "Generate fits using the app",
      image: "/lovable-uploads/outfitgrader-ai-3.png"
    },
    {
      title: "Get ratings for your fit and advice",
      image: "/lovable-uploads/outfitgrader-ai-6.png"
    }
  ];

  // Auto-scroll through screens
  useEffect(() => {
    autoScrollRef.current = setInterval(() => {
      setCurrentScreen((prev) => (prev + 1) % screens.length);
    }, 3000);

    return () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
      }
    };
  }, [screens.length]);

  const handleGetStarted = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      // Check if user already exists
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        Logger.info('WelcomeHero', 'User already exists:', session.user.id);
        if (onUserCreated) {
          onUserCreated(session.user.id);
        }
        onNext();
        return;
      }

      // Create anonymous user
      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (error) throw error;
      
      if (data.user) {
        Logger.info('WelcomeHero', 'Anonymous user created:', data.user.id);
        if (onUserCreated) {
          onUserCreated(data.user.id);
        }
        
        // Small delay to ensure parent state is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        onNext();
      }
    } catch (error) {
      Logger.error('WelcomeHero', 'Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to get started. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    // `screen-safe` (see index.css) instead of `min-h-screen` so the
    // Join-for-free button gets lifted above the iOS home indicator on
    // notched iPhones. `app-content` opts into the iPad letterbox rule.
    <div className="screen-safe app-content bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center px-6 pt-8 pb-safe-button">
        {/* App Title - More compact */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-bold text-black mb-6 text-center"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif' }}
        >
          trendza
        </motion.h1>

        {/* Phone Mockup with Sliding Screens - Smaller */}
        <div className="relative w-full max-w-[240px] mb-4">
          <div className="relative overflow-hidden rounded-[40px] bg-black p-2 shadow-2xl">
            <div className="bg-white rounded-[32px] overflow-hidden relative h-[480px]">
              {/* Status Bar */}
              <div className="flex items-center justify-start px-6 pt-3 pb-2">
                <span className="text-black text-sm font-semibold">12:34</span>
              </div>

              {/* Sliding Screens */}
              <div className="relative h-[calc(100%-50px)] overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentScreen}
                    initial={{ opacity: 0, x: 300 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -300 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="absolute inset-0"
                  >
                    <img
                      src={screens[currentScreen].image}
                      alt={screens[currentScreen].title}
                      className="w-full h-full object-contain"
                      style={{
                        imageRendering: 'crisp-edges',
                        WebkitTransform: 'translate3d(0, 0, 0)',
                        transform: 'translate3d(0, 0, 0)',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden'
                      }}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Screen Title Text - Compact */}
        <AnimatePresence mode="wait">
          <motion.p
            key={currentScreen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-black text-center text-base font-medium mb-3 px-4"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif' }}
          >
            {screens[currentScreen].title}
          </motion.p>
        </AnimatePresence>

        {/* Pagination Dots - Compact */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {screens.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (autoScrollRef.current) {
                  clearInterval(autoScrollRef.current);
                }
                setCurrentScreen(index);
                autoScrollRef.current = setInterval(() => {
                  setCurrentScreen((prev) => (prev + 1) % screens.length);
                }, 3000);
              }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentScreen === index ? 'bg-black w-6' : 'bg-gray-300'
              }`}
              aria-label={`Go to screen ${index + 1}`}
            />
          ))}
        </div>

        {/* Join for Free Button - Visible without scrolling */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          onClick={handleGetStarted}
          disabled={isProcessing}
          className="w-full max-w-sm bg-black text-white font-semibold py-4 px-8 rounded-2xl text-lg transition-all duration-200 hover:bg-gray-900 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif' }}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Joining...</span>
            </div>
          ) : (
            "Join for free"
          )}
        </motion.button>
      </div>
    </div>
  );
};
