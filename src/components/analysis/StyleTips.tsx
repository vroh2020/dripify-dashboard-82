
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StyleTip } from "@/types/styleTypes";
import { useState } from "react";
import { cn } from "@/lib/utils";

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
      className="bg-[#2C2C3E] backdrop-blur-lg rounded-2xl overflow-hidden shadow-2xl border border-white/10"
    >
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-[#9b87f5]" />
          <h3 className="text-xl font-semibold text-white">Style Tips</h3>
        </div>
        
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`text-xs rounded-full px-3 py-1 transition-all duration-300 ${
                selectedCategory === null 
                  ? 'bg-[#9b87f5] text-white' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              All
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`text-xs rounded-full px-3 py-1 transition-all duration-300 ${
                  selectedCategory === category 
                    ? 'bg-[#9b87f5] text-white' 
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
                className={cn(
                  "p-4 rounded-xl bg-[#3A3A4C] border border-transparent transition-all duration-300 hover:border-[#9b87f5]/30 hover:shadow-lg",
                  tip.level === 'advanced' && "bg-gradient-to-r from-[#6A5ACD]/20 to-[#8A4FFF]/20 border-[#9b87f5]/30"
                )}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      tip.level === 'advanced' 
                        ? "bg-[#9b87f5]/20" 
                        : "bg-[#4A4A5E]"
                    )}>
                      <Lightbulb 
                        className={cn(
                          "w-4 h-4", 
                          tip.level === 'advanced' 
                            ? "text-[#9b87f5]" 
                            : "text-[#7E69AB]"
                        )} 
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white/90 leading-relaxed">{tip.tip}</p>
                    <div className="flex items-center mt-2">
                      <span className="text-xs text-white/50">{tip.category}</span>
                      <div className="ml-auto">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          tip.level === 'advanced'
                            ? 'bg-[#9b87f5]/20 text-[#9b87f5]'
                            : 'bg-[#7E69AB]/20 text-[#7E69AB]'
                        }`}>
                          {tip.level}
                        </span>
                      </div>
                    </div>
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
