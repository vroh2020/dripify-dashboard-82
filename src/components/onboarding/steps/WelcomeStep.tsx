import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep = ({ onNext }: WelcomeStepProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-gradient-to-b from-purple-900/40 via-purple-800/20 to-black flex flex-col justify-center items-center px-6 py-8 relative overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`,
        }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center space-y-8 max-w-sm">
        {/* Title */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-4xl font-bold text-white leading-tight"
        >
          Welcome to Dripify AI
        </motion.h1>

        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-lg text-gray-300 font-medium"
        >
          Your personal AI style assistant
        </motion.p>

        {/* Star Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.8, type: "spring", bounce: 0.4 }}
          className="flex justify-center"
        >
          <div className="relative">
            {/* Outer star outline */}
            <div className="w-16 h-16 relative">
              <div className="absolute inset-0">
                <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                  <path 
                    d="M12 2L14.09 8.26L22 9L16 14.14L17.18 22.02L12 18.77L6.82 22.02L8 14.14L2 9L9.91 8.26L12 2Z" 
                    stroke="#f97316" 
                    strokeWidth="1.5" 
                    fill="none"
                  />
                </svg>
              </div>
              {/* Inner solid star */}
              <div className="absolute top-1 right-1">
                <svg viewBox="0 0 24 24" fill="#f97316" className="w-6 h-6">
                  <path d="M12 2L14.09 8.26L22 9L16 14.14L17.18 22.02L12 18.77L6.82 22.02L8 14.14L2 9L9.91 8.26L12 2Z" />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Description */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="text-base text-gray-400 leading-relaxed"
        >
          Get personalized style recommendations powered by AI
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.8 }}
          className="pt-4"
        >
          <Button
            onClick={onNext}
            className="w-full max-w-xs h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all duration-300 hover:scale-105 shadow-2xl"
          >
            Let's get started
          </Button>
        </motion.div>
      </div>

      {/* Footer Branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-4 right-4 text-white/30 text-xs flex items-center gap-1"
      >
        <span>Edit with</span>
        <span className="text-red-400">♥</span>
        <span>Lovable</span>
      </motion.div>
    </motion.div>
  );
};
