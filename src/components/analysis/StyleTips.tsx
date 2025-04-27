
import { motion } from "framer-motion";
import { Lightbulb, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StyleTip } from "@/types/styleTypes";
import { useState } from "react";

interface StyleTipsProps {
  tips: StyleTip[];
}

export const StyleTips = ({ tips }: StyleTipsProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Get unique categories
  const categories = Array.from(new Set(tips.map(tip => tip.category)));
  
  const filteredTips = selectedCategory 
    ? tips.filter(tip => tip.category === selectedCategory)
    : tips;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-black/30 backdrop-blur-lg border-white/10 rounded-lg overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          <h3 className="text-xl font-semibold text-white">Style Tips</h3>
        </div>
        
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`text-xs rounded-full px-3 py-1 ${
                selectedCategory === null 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              All
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`text-xs rounded-full px-3 py-1 ${
                  selectedCategory === category 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}
        
        <ScrollArea className="h-[250px] pr-4">
          <div className="space-y-3">
            {filteredTips.map((tip, index) => (
              <motion.div
                key={`${tip.category}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-lg ${
                  tip.level === 'advanced'
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className="flex gap-2">
                  <div className="flex-shrink-0 mt-1">
                    {tip.level === 'advanced' ? (
                      <span className="text-yellow-400 text-sm">⭐</span>
                    ) : (
                      <span className="text-blue-400 text-sm">•</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-white/80">{tip.tip}</p>
                    <p className="text-xs text-white/50 mt-1">{tip.category}</p>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {filteredTips.length === 0 && (
              <div className="text-center py-8 text-white/50">
                No tips available for this category
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  );
};
