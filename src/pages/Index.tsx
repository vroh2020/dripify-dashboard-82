import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardView } from "@/components/DashboardView";
import { ScanView } from "@/components/ScanView";
import { TipsView } from "@/components/TipsView";
import { LayoutDashboard, Scan, MessageSquare, User } from "lucide-react";
import { motion } from "framer-motion";
import { Link, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useSession } from "@/hooks/useSession";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.split('/')[1] || 'dashboard';
  const { session, user, isLoading } = useSession();

  // Check authentication and redirect if needed
  useEffect(() => {
    // Auth check - redirect if no session
    // Only redirect if we're done loading and have no session
    if (!isLoading && (!session || !user)) {
      navigate('/auth');
    }
  }, [session, user, isLoading, navigate]);

  // Sync tab value with URL
  useEffect(() => {
    if (location.pathname === '/') {
      navigate('/dashboard');
    }
  }, [location.pathname, navigate]);

  const handleTabChange = (value: string) => {
    navigate(`/${value}`);
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-[#1A1F2C] via-[#2C1F3D] to-[#1A1F2C] flex items-center justify-center">
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-white text-lg font-medium"
        >
          Loading your style profile...
        </motion.div>
      </div>
    );
  }

  // Don't render main app if not authenticated (will redirect in useEffect)
  if (!session || !user) {
    return null;
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#1A1F2C] via-[#2C1F3D] to-[#1A1F2C] relative overflow-x-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center py-4 px-4 safe-area-top"
      >
        <motion.h1 
          className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 text-transparent bg-clip-text"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          Drip Max
        </motion.h1>
        
        <Link 
          to="/profile" 
          className="p-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-200 hover:scale-110"
        >
          <User className="w-5 h-5 text-white/80" />
        </Link>
      </motion.div>
      
      <Tabs value={currentPath} onValueChange={handleTabChange} className="flex flex-col h-[calc(100dvh-80px)]">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <Routes>
            <Route path="/dashboard" element={<DashboardView />} />
            <Route path="/scan" element={<ScanView />} />
            <Route path="/tips" element={<TipsView />} />
            <Route path="/" element={<DashboardView />} />
          </Routes>
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
