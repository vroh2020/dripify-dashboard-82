
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { StyleTip } from "@/types/styleTypes";
import { Card, CardContent } from "@/components/ui/card";

interface StyleTipsProps {
  tips: StyleTip[];
}

export const StyleTips = ({ tips }: StyleTipsProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-4"
    >
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-yellow-400" />
        Recommendations
      </h3>

      {tips.map((tip, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
            <CardContent className="p-4">
              <h4 className="text-white font-medium mb-2">{tip.category}</h4>
              <p className="text-sm text-white/70 leading-relaxed">{tip.tip}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};

