
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { StyleTip } from "@/types/styleTypes";
import { Card, CardContent } from "@/components/ui/card";

interface StyleTipsProps {
  tips: StyleTip[];
}

export const StyleTips = ({ tips }: StyleTipsProps) => {
  // Get the most important tips based on level and category
  const prioritizeTips = (): StyleTip[] => {
    // First get advanced tips (highest priority)
    const advancedTips = tips
      .filter(tip => tip.level === "advanced")
      .slice(0, 3);
    
    // If we don't have enough advanced tips, add intermediate ones
    if (advancedTips.length < 3) {
      const intermediateCount = 3 - advancedTips.length;
      const intermediateTips = tips
        .filter(tip => tip.level === "intermediate")
        .slice(0, intermediateCount);
      advancedTips.push(...intermediateTips);
    }
    
    // Ensure we always have exactly 3 tips by adding beginner tips if needed
    if (advancedTips.length < 3) {
      const remainingCount = 3 - advancedTips.length;
      const beginnerTips = tips
        .filter(tip => tip.level === "beginner")
        .slice(0, remainingCount);
      advancedTips.push(...beginnerTips);
    }
    
    return advancedTips.slice(0, 3); // Ensure we return exactly 3 tips
  };
  
  const crucialTips = prioritizeTips();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-[#121212] rounded-xl p-6 max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          Get tips to enhance your style
        </h2>
        <p className="text-gray-400">
          Key recommendations to improve your look
        </p>
      </div>

      <div className="space-y-4 mt-8">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-[#ff6b6b]" />
          Recommendations
        </h3>

        <div className="space-y-4">
          {crucialTips.map((tip, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-[#1E1E1E] border border-white/5">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="mt-1">
                      <div className="w-8 h-8 rounded-full bg-[#ff6b6b]/10 flex items-center justify-center">
                        <Lightbulb className="w-4 h-4 text-[#ff6b6b]" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-white font-medium mb-2">{tip.tip}</h4>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        <span className="text-[#ff6b6b] font-medium">{tip.category}</span> - This 
                        tip will help you improve your overall style by focusing on {tip.category.toLowerCase()} 
                        elements in your outfit.
                      </p>
                      <div className="mt-2 bg-black/20 p-2 rounded text-xs text-gray-400">
                        <strong>Why this matters:</strong> Implementing this advice can 
                        enhance how others perceive your fashion sense and boost your confidence.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

