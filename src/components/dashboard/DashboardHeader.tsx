import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DashboardHeaderProps {
  avatarUrl: string | null | undefined;
}

export const DashboardHeader = ({ avatarUrl }: DashboardHeaderProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-between py-6 px-4"
    >
      <div>
        <h1 className="text-2xl font-bold text-white">Drip Check</h1>
        <p className="text-sm text-white/70">Style Analysis</p>
      </div>

      <button onClick={() => navigate('/profile')} className="rounded-full">
        <Avatar className="w-10 h-10 border-2 border-white/20">
          <AvatarImage src={avatarUrl ?? undefined} />
          <AvatarFallback>
            <User className="text-white/70" />
          </AvatarFallback>
        </Avatar>
      </button>
    </motion.div>
  );
};
