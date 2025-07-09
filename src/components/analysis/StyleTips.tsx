
import { motion } from "framer-motion";
import { Lightbulb, Zap, AlertTriangle, ArrowUpCircle } from "lucide-react";
import { StyleTip } from "@/types/styleTypes";
import { Card, CardContent } from "@/components/ui/card";

interface DetailedAnalysis {
  vibe?: string;
  whatsWorking?: string;
  whatsNot?: string;
  elevateTheDrip?: string;
}

interface StyleTipsProps {
  tips: StyleTip[];
  analysis: DetailedAnalysis;
}

export const StyleTips = ({ tips, analysis }: StyleTipsProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-6"
    >
      {analysis.vibe && (
        <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Vibe Check
            </h3>
            <p className="text-white/80">{analysis.vibe}</p>
          </CardContent>
        </Card>
      )}

      {analysis.whatsWorking && (
        <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5 text-green-400" />
              What's Working
            </h3>
            <p className="text-white/80">{analysis.whatsWorking}</p>
          </CardContent>
        </Card>
      )}

      {analysis.whatsNot && (
        <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              What's Not
            </h3>
            <p className="text-white/80">{analysis.whatsNot}</p>
          </CardContent>
        </Card>
      )}

      {analysis.elevateTheDrip && (
        <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
              <ArrowUpCircle className="w-5 h-5 text-purple-400" />
              Elevate The Drip
            </h3>
            <p className="text-white/80">{analysis.elevateTheDrip}</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

