
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  hasScans: boolean;
  totalScans: number;
  onSignOut: () => void;
}

export const DashboardHeader = ({ hasScans, totalScans, onSignOut }: DashboardHeaderProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-6 flex justify-between items-center"
    >
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-[#9b87f5] to-[#D6BCFA] text-transparent bg-clip-text">
          {hasScans ? `Welcome Back!` : 'Welcome to DripCheck'}
        </h1>
        <p className="text-[#C8C8C9] text-sm mt-1">
          {hasScans 
            ? `You've completed ${totalScans} style ${totalScans === 1 ? 'scan' : 'scans'}!` 
            : "Let's discover your unique style"}
        </p>
      </div>
      <Button 
        variant="ghost" 
        size="icon"
        onClick={onSignOut}
        className="hover:bg-white/10"
      >
        <LogOut className="h-5 w-5 text-white/60" />
      </Button>
    </motion.div>
  );
};
