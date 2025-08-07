import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, Award, Eye } from "lucide-react";

interface TeaserResultStepProps {
  onUnlock: () => void;
  result: {
    overallScore: number;
    breakdown: any[];
    grade?: string;
    summary?: string;
  };
}

export const TeaserResultStep = ({ onUnlock, result }: TeaserResultStepProps) => {
  const grade = result.grade || (result.overallScore >= 85 ? 'A+' : result.overallScore >= 80 ? 'A' : result.overallScore >= 75 ? 'B+' : 'B');
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 px-6 py-8"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-20 h-20 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <Award className="w-10 h-10 text-white" />
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-4xl font-bold text-white mb-3"
        >
          Your Style Analysis is Ready!
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-gray-300 text-lg"
        >
          Unlock your comprehensive style report to see your detailed breakdown
        </motion.p>
      </div>

      {/* Score Preview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="relative mb-8"
      >
        {/* Blur overlay */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-md rounded-3xl z-10" />
        
        {/* Lock icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-black/60 backdrop-blur-md rounded-full p-6 border border-white/20">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        {/* Score display with blur */}
        <div className="filter blur-sm bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8">
          <div className="text-center">
            <div className="text-6xl font-black text-white mb-4">
              {result.overallScore}
            </div>
            <div className="text-2xl font-bold text-red-500 mb-2">
              Grade: {grade}
            </div>
            <div className="text-gray-300 text-lg">
              Overall Style Score
            </div>
          </div>
          
          {/* Preview of breakdown */}
          <div className="mt-6 space-y-3">
            {result.breakdown.slice(0, 3).map((item, index) => (
              <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-white font-medium">{item.category}</span>
                </div>
                <div className="text-white font-bold">{item.score}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.5 }}
        className="w-full max-w-sm mx-auto mb-6"
      >
        <Button
          onClick={onUnlock}
          className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white h-16 text-xl font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl border-0"
        >
          <Sparkles className="w-6 h-6 mr-3" />
          Unlock My Full Report
        </Button>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="text-center"
      >
        <div className="flex items-center justify-center space-x-2 text-gray-400 text-sm">
          <Eye className="w-4 h-4" />
          <span>Your personalized report is ready to view</span>
        </div>
      </motion.div>
    </motion.div>
  );
}; 