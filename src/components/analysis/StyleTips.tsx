
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { StyleTip } from "@/types/styleTypes";

interface StyleTipsProps {
  tips: StyleTip[];
}

export const StyleTips = ({ tips }: StyleTipsProps) => {
  // Get the 3 most important tips
  const crucialTips = tips
    .filter(tip => tip.level === "advanced")
    .slice(0, 3);

  // If we don't have enough advanced tips, add intermediate ones
  if (crucialTips.length < 3) {
    const intermediateCount = 3 - crucialTips.length;
    const intermediateTips = tips
      .filter(tip => tip.level === "intermediate")
      .slice(0, intermediateCount);
    crucialTips.push(...intermediateTips);
  }

  // Ensure we always have 3 tips by adding beginner tips if needed
  if (crucialTips.length < 3) {
    const remainingCount = 3 - crucialTips.length;
    const beginnerTips = tips
      .filter(tip => tip.level === "beginner")
      .slice(0, remainingCount);
    crucialTips.push(...beginnerTips);
  }

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

        {crucialTips.map((tip, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-[#1E1E1E] rounded-lg p-4 border border-white/5"
          >
            <div className="flex gap-3">
              <div className="mt-1">
                <div className="w-8 h-8 rounded-full bg-[#ff6b6b]/10 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-[#ff6b6b]" />
                </div>
              </div>
              <div>
                <h4 className="text-white font-medium mb-2">{tip.tip}</h4>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {tip.category} - This tip will help you improve your overall style by focusing on {tip.category.toLowerCase()} aspects.
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
