import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardView } from "@/components/DashboardView";
import { ScanView } from "@/components/ScanView";
import { TipsView } from "@/components/TipsView";
import { LayoutDashboard, Scan, MessageSquare, User } from "lucide-react";
import { motion } from "framer-motion";
import { Link, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import Profile from "@/pages/Profile";


const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.split('/')[1] || 'dashboard';
  
  // Add render counter to prevent infinite loops
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  
  // Prevent excessive logging
  if (renderCountRef.current <= 3) {
    console.log('🎯 Index component rendered:', {
      currentPath,
      location: location.pathname,
      renderCount: renderCountRef.current,
      timestamp: new Date().toISOString()
    });
  } else if (renderCountRef.current === 4) {
    console.warn('⚠️ Index component rendering too frequently - stopping logs');
  }

  // Sync tab value with URL
  useEffect(() => {
    if (location.pathname === '/') {
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleTabChange = (value: string) => {
    if (renderCountRef.current <= 3) {
      console.log('🎯 Tab changed to:', value);
    }
    navigate(`/${value}`);
  };

  // Simple conditional rendering instead of nested Routes
  const renderContent = () => {
    if (renderCountRef.current <= 3) {
      console.log('🎯 Rendering content for path:', currentPath);
    }
    
    try {
      switch (currentPath) {
        case 'dashboard':
          return <DashboardView />;
        case 'scan':
          return <ScanView />;
        case 'profile':
          return <Profile />;
        case 'tips':
          return <TipsView />;
        default:
          return <DashboardView />;
      }
    } catch (error) {
      console.error('🎯 Error rendering content:', error);
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Something went wrong</h3>
            <p className="text-gray-400 mb-4">There was an error loading this content</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <div 
      className="min-h-[100dvh] bg-gradient-to-br from-[#1A1F2C] via-[#2C1F3D] to-[#1A1F2C] relative overflow-x-hidden"
      style={{ paddingTop: `env(safe-area-inset-top)` }}
    >
      <DashboardHeader />
      
      <Tabs value={currentPath} onValueChange={handleTabChange} className="flex flex-col h-[calc(100dvh-88px)]">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pt-2">
          {(() => {
            try {
              console.log('🎯 Attempting to render content...');
              const content = renderContent();
              console.log('🎯 Content rendered successfully');
              return content;
            } catch (error) {
              console.error('🎯 Error rendering content:', error);
              return (
                <div className="flex items-center justify-center min-h-[50vh] text-white">
                  <div className="text-center">
                    <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
                    <p className="text-white/60 mb-4">Error loading dashboard content</p>
                    <button 
                      onClick={() => window.location.reload()}
                      className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg"
                    >
                      Reload
                    </button>
                  </div>
                </div>
              );
            }
          })()}
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
