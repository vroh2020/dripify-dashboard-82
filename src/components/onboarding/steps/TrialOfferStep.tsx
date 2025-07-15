import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Crown, Star } from "lucide-react";

interface TrialOfferStepProps {
  onNext: () => void;
}

export const TrialOfferStep = ({ onNext }: TrialOfferStepProps) => {
  return (
    <motion.div
      key="trial-offer"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="h-full flex flex-col bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute top-20 right-10 w-32 h-32 bg-orange-400/10 rounded-full blur-xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-32 left-8 w-24 h-24 bg-purple-400/10 rounded-full blur-xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1 }}
        />
      </div>

      {/* Header */}
      <div className="pt-16 pb-8 px-8 text-center relative z-10">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 15 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-orange-400 to-orange-500 rounded-2xl mb-6 shadow-2xl"
        >
          <Crown className="w-10 h-10 text-white" />
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-4xl font-bold text-white mb-4"
        >
          Unlock Your Style
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-500">
            Potential
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-white/70 text-lg"
        >
          Join thousands who've elevated their style
        </motion.p>
      </div>

      {/* Features Section */}
      <div className="flex-1 px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-8"
        >
          <div className="space-y-4">
            {[
              { icon: Sparkles, text: "Unlimited AI Style Analyses", highlight: true },
              { icon: Star, text: "Personalized Style Recommendations" },
              { icon: Check, text: "Advanced Outfit Ratings" },
              { icon: Crown, text: "Premium Style Tips & Insights" }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 + index * 0.1 }}
                className="flex items-center space-x-4"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  feature.highlight 
                    ? 'bg-gradient-to-r from-orange-400 to-orange-500' 
                    : 'bg-white/10'
                }`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-lg font-medium">{feature.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Pricing */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-baseline space-x-2">
            <span className="text-5xl font-bold text-white">$12.99</span>
            <span className="text-white/50 text-lg">/month</span>
          </div>
          <p className="text-orange-300 text-sm mt-2 font-medium">
            ✨ 7-day free trial included
          </p>
        </motion.div>
      </div>

      {/* CTA Button */}
      <div className="px-8 pb-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7 }}
        >
          <Button
            onClick={onNext}
            className="w-full h-16 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white text-xl font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl border-0"
          >
            Start Free Trial
          </Button>
          <p className="text-white/40 text-xs text-center mt-4">
            Cancel anytime • No commitment
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};
