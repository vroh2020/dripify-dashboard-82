import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] via-[#2C1F3D] to-[#1A1F2C] flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] via-[#2C1F3D] to-[#1A1F2C] relative safe-area-padding">
      <div className="container-responsive min-h-screen pb-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center py-6 sm:py-8 px-4 sm:px-6"
        >
          <motion.h1 
            className="text-3xl sm:text-4xl font-bold gradient-text"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            Drip Max
          </motion.h1>
          
          <Link 
            to="/profile" 
            className="p-3 rounded-full glass-effect hover:bg-white/20 transition-all duration-200 hover:scale-110 touch-size"
          >
            <User className="w-6 h-6 text-white/80" />
          </Link>
        </motion.div>
        
        <Tabs value={currentPath} onValueChange={handleTabChange} className="w-full">
          <div className="px-4 sm:px-6">
            <Routes>
              <Route path="/dashboard" element={<DashboardView />} />
              <Route path="/scan" element={<ScanView />} />
              <Route path="/tips" element={<TipsView />} />
              <Route path="/" element={<DashboardView />} />
            </Routes>
          </div>

          {/* Bottom Navigation */}
          <motion.div 
            initial={{ y: 100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-xl border-t border-white/10 safe-area-padding"
          >
            <TabsList className="w-full h-16 sm:h-20 grid grid-cols-3 bg-transparent gap-1 p-2">
              <TabsTrigger 
                value="dashboard" 
                className="flex flex-col items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/20 data-[state=active]:to-orange-400/20 data-[state=active]:text-orange-400 rounded-xl transition-all duration-200 text-white/70 hover:text-white touch-size"
              >
                <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-xs sm:text-sm font-medium">Dashboard</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="scan" 
                className="flex flex-col items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/20 data-[state=active]:to-orange-400/20 data-[state=active]:text-orange-400 rounded-xl transition-all duration-200 text-white/70 hover:text-white touch-size"
              >
                <Scan className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-xs sm:text-sm font-medium">Scan</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="tips" 
                className="flex flex-col items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/20 data-[state=active]:to-orange-400/20 data-[state=active]:text-orange-400 rounded-xl transition-all duration-200 text-white/70 hover:text-white touch-size"
              >
                <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-xs sm:text-sm font-medium">Tips</span>
              </TabsTrigger>
            </TabsList>
          </motion.div>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
