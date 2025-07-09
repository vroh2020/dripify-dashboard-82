import { motion } from "framer-motion";
import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const DashboardHeader = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-between px-4"
      style={{ 
        paddingTop: `calc(env(safe-area-inset-top, 0px) + 1rem)`,
        paddingBottom: '1rem'
      }}
    >
      <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-orange-500">
        Drip Check
      </h1>

      <Button
        variant="ghost"
        size="icon"
        className="rounded-full text-white/80 hover:bg-white/10 hover:text-white"
        onClick={() => navigate('/profile')}
      >
        <User className="h-6 w-6" />
      </Button>
    </motion.div>
  );
};
