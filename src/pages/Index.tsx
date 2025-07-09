import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardView } from "@/components/DashboardView";
import { ScanView } from "@/components/ScanView";
import { TipsView } from "@/components/TipsView";
import { LayoutDashboard, Scan, MessageSquare, User } from "lucide-react";
import { motion } from "framer-motion";
import { Link, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";


const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.split('/')[1] || 'dashboard';

  // Sync tab value with URL
  useEffect(() => {
    if (location.pathname === '/') {
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleTabChange = (value: string) => {
    navigate(`/${value}`);
  };

  // Simple conditional rendering instead of nested Routes
  const renderContent = () => {
    switch (currentPath) {
      case 'scan':
        return <ScanView />;
      case 'tips':
        return <TipsView />;
      case 'dashboard':
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#1A1F2C] via-[#2C1F3D] to-[#1A1F2C] relative overflow-x-hidden">
      <DashboardHeader />
      
      <Tabs value={currentPath} onValueChange={handleTabChange} className="flex flex-col h-[calc(100dvh-64px)]">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {renderContent()}
        </div>

        {/* Bottom Navigation - Fixed */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-black/40 backdrop-blur-xl border-t border-white/10 safe-area-bottom"
        >
          <TabsList className="w-full h-16 grid grid-cols-3 bg-transparent gap-0 p-0">
            <TabsTrigger 
              value="dashboard" 
              className="flex flex-col items-center justify-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/20 data-[state=active]:to-orange-400/20 data-[state=active]:text-orange-400 rounded-none transition-all duration-200 text-white/70 hover:text-white h-full"
            >
              <LayoutDashboard className="h-5 w-5" />
              <span className="text-xs font-medium">Dashboard</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="scan" 
              className="flex flex-col items-center justify-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/20 data-[state=active]:to-orange-400/20 data-[state=active]:text-orange-400 rounded-none transition-all duration-200 text-white/70 hover:text-white h-full"
            >
              <Scan className="h-5 w-5" />
              <span className="text-xs font-medium">Scan</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="tips" 
              className="flex flex-col items-center justify-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/20 data-[state=active]:to-orange-400/20 data-[state=active]:text-orange-400 rounded-none transition-all duration-200 text-white/70 hover:text-white h-full"
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-xs font-medium">Tips</span>
            </TabsTrigger>
          </TabsList>
        </motion.div>
      </Tabs>
    </div>
  );
};

export default Index;
