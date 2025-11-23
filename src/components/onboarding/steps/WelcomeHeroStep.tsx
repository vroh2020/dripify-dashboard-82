import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Logger } from "@/utils/logger";
import { useToast } from "@/hooks/use-toast";

interface WelcomeHeroStepProps {
  onNext: () => void;
  onUserCreated?: (userId: string) => void;
}

export const WelcomeHeroStep = ({ onNext, onUserCreated }: WelcomeHeroStepProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12 safe-area-inset">
      {/* Content */}
      <div className="flex flex-col items-center justify-center text-center w-full max-w-md mx-auto flex-1">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold text-black mb-3" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 700 }}>
            OutfitGrader AI
          </h1>
          
          <p className="text-base text-gray-600 leading-relaxed" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
            Your AI Style Assistant
          </p>
        </motion.div>

        {/* Feature checklist - 3 items max */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-16 space-y-6 w-full"
        >
          <div className="flex items-center gap-5 text-left">
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-base text-gray-900" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 500 }}>
              Grade any outfit instantly
            </span>
          </div>
          <div className="flex items-center gap-5 text-left">
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-base text-gray-900" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 500 }}>
              Get personalized style tips
            </span>
          </div>
          <div className="flex items-center gap-5 text-left">
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-base text-gray-900" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 500 }}>
              Track your style evolution
            </span>
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="w-full mt-auto"
        >
          <button
            onClick={handleGetStarted}
            disabled={isProcessing}
            className="w-full bg-black text-white font-semibold py-5 px-8 rounded-2xl text-lg transition-all duration-200 hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 600 }}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Getting Started...</span>
              </div>
            ) : (
              "Get Started"
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
};
