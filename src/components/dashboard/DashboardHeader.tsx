
import { motion } from "framer-motion";
import { LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="hover:bg-white/10">
            <Settings className="h-5 w-5 text-white/60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-black/90 border-white/10">
          <DropdownMenuItem 
            className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
            onClick={onSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
};
