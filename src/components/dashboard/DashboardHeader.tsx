import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  hasScans: boolean;
  totalScans: number;
}

export const DashboardHeader = ({ hasScans, totalScans }: DashboardHeaderProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-8 flex justify-between items-start"
    >
      <div>
        <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-orange-500">
          Drip Max
        </div>
        <p className="text-white/70 text-sm">
          Style Analysis
        </p>
      </div>
    </motion.div>
  );
};
