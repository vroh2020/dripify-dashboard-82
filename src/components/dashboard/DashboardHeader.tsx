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
      className="flex items-center justify-between px-4 py-4 border-b border-gray-100"
    >
      <h1 className="text-xl font-bold text-black">
        TRENDZA
      </h1>

      <Button
        variant="ghost"
        size="icon"
        className="rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        onClick={() => navigate('/profile')}
      >
        <User className="h-5 w-5" />
      </Button>
    </motion.div>
  );
};
