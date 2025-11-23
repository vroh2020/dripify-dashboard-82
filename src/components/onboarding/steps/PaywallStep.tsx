import { useState } from "react";
import { motion } from "framer-motion";
import { X, Star } from "lucide-react";

interface PaywallStepProps {
  onComplete: (tier: string) => void;
}

export const PaywallStep = ({ onComplete }: PaywallStepProps) => {
  const [selectedPlan, setSelectedPlan] = useState<string>("weekly");
  const [xClickCount, setXClickCount] = useState(0);

  const handleXClick = () => {
    const newCount = xClickCount + 1;
    setXClickCount(newCount);
    
    if (newCount >= 2) {
      // After 2 clicks, allow free tier
      onComplete('free');
    }
  };

  const handleSubscribe = () => {
    // Here you would integrate with RevenueCat
    onComplete(selectedPlan);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with X button */}
      <div className="flex justify-start px-6 pt-6 pb-4">
        <button
          onClick={handleXClick}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-8 pb-8">
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-black mb-6"
          style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 700 }}
        >
          Choose your plan
        </motion.h1>

        {/* 5-star rating */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center gap-2 mb-4"
        >
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={32} fill="#FFA500" stroke="none" />
          ))}
        </motion.div>

        {/* Review text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center text-sm text-gray-900 leading-relaxed mb-2 px-2"
          style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}
        >
          "Game changer for my daily style! Makes getting dressed so much easier and more fun."
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-xs text-gray-500 mb-8"
          style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}
        >
          - Sarah M.
        </motion.p>

        {/* Pricing cards */}
        <div className="space-y-3 mb-6">
          {/* 3 months plan */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={() => setSelectedPlan('3month')}
            className={`w-full border rounded-2xl p-4 transition-all ${
              selectedPlan === '3month' ? 'border-2 border-black bg-gray-50' : 'border border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedPlan === '3month' ? 'border-black bg-black' : 'border-gray-300'
                }`}>
                  {selectedPlan === '3month' && (
                    <div className="w-2.5 h-2.5 bg-white rounded-full" />
                  )}
                </div>
                <div className="text-left">
                  <div 
                    className="text-sm font-semibold text-black"
                    style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 600 }}
                  >
                    3 months plan
                  </div>
                  <div 
                    className="text-xs text-gray-500"
                    style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}
                  >
                    3 mo • $19.99
                  </div>
                </div>
              </div>
              <div 
                className="text-sm font-medium text-gray-900"
                style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 500 }}
              >
                $1.67 / week
              </div>
            </div>
          </motion.button>

          {/* 12 months - MOST POPULAR */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative"
          >
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
              <div className="bg-gradient-to-r from-orange-400 to-red-400 text-white px-3 py-1 rounded-full text-xs font-bold"
                style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 700 }}
              >
                MOST POPULAR
              </div>
            </div>
            <button
              onClick={() => setSelectedPlan('annual')}
              className={`w-full border rounded-2xl p-4 transition-all mt-3 ${
                selectedPlan === 'annual' 
                  ? 'border-2 border-black bg-gradient-to-r from-orange-50 to-red-50' 
                  : 'border-2 border-orange-300 bg-gradient-to-r from-orange-50/50 to-red-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === 'annual' ? 'border-black bg-black' : 'border-gray-300'
                  }`}>
                    {selectedPlan === 'annual' && (
                      <div className="w-2.5 h-2.5 bg-white rounded-full" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-sm font-bold text-black"
                        style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 700 }}
                      >
                        Welcome offer
                      </span>
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 700 }}
                      >
                        SAVE 65%
                      </span>
                    </div>
                    <div 
                      className="text-xs text-gray-600"
                      style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}
                    >
                      12 mo • $39.99
                    </div>
                  </div>
                </div>
                <div 
                  className="text-sm font-bold text-black"
                  style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 700 }}
                >
                  $0.77 / week
                </div>
              </div>
            </button>
          </motion.div>

          {/* Lifetime plan */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={() => setSelectedPlan('lifetime')}
            className={`w-full border rounded-2xl p-4 transition-all ${
              selectedPlan === 'lifetime' ? 'border-2 border-black bg-gray-50' : 'border border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedPlan === 'lifetime' ? 'border-black bg-black' : 'border-gray-300'
                }`}>
                  {selectedPlan === 'lifetime' && (
                    <div className="w-2.5 h-2.5 bg-white rounded-full" />
                  )}
                </div>
                <div className="text-left">
                  <div 
                    className="text-sm font-semibold text-black"
                    style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 600 }}
                  >
                    Lifetime access
                  </div>
                  <div 
                    className="text-xs text-gray-500"
                    style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}
                  >
                    One-time • $99.99
                  </div>
                </div>
              </div>
              <div 
                className="text-sm font-medium text-gray-900"
                style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 500 }}
              >
                Pay once
              </div>
            </div>
          </motion.button>
        </div>

        {/* Continue button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          onClick={handleSubscribe}
          className="w-full bg-gradient-to-r from-orange-400 to-red-400 text-white font-bold py-5 px-8 rounded-2xl text-lg shadow-lg hover:from-orange-500 hover:to-red-500 transition-all mb-3"
          style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 700 }}
        >
          CONTINUE
        </motion.button>

        {/* Bottom text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-gray-500"
          style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}
        >
          Recurring billing. Cancel anytime
        </motion.p>
      </div>
    </div>
  );
};

