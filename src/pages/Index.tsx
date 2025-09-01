import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardView } from "@/components/DashboardView";
import { ScanView } from "@/components/ScanView";

import ClosetView from "@/components/closet/ClosetView";
import { Scan, Shirt } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import Profile from "@/pages/Profile";


const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.split('/')[1] || 'dashboard';
  console.log('🎯 Path calculation:', {
    fullPath: location.pathname,
    splitResult: location.pathname.split('/'),
    currentPath: currentPath
  });
  
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
    if (location.pathname === '/' || location.pathname === '/dashboard') {
      navigate('/scan', { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleTabChange = (value: string) => {
    console.log('🎯 Tab changed to:', value);
    console.log('🎯 Current location before navigation:', location.pathname);
    navigate(`/${value}`);
  };

  // Simple conditional rendering instead of nested Routes
  const renderContent = () => {
    console.log('🎯 Rendering content for path:', currentPath);
    console.log('🎯 Full location pathname:', location.pathname);
    
    try {
      switch (currentPath) {
        case 'dashboard':
          return <DashboardView />;
        case 'scan':
          return <ScanView />;
        case 'closet':
          return <ClosetView />;
        case 'profile':
          return <Profile />;

        default:
          return <ScanView />;
      }
    } catch (error) {
      console.error('🎯 Error rendering content:', error);
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
            <p className="text-gray-600 mb-4">There was an error loading this content</p>
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
      className="min-h-[100dvh] bg-white relative overflow-x-hidden"
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
                <div className="flex items-center justify-center min-h-[50vh] text-gray-900">
                  <div className="text-center">
                    <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
                    <p className="text-gray-600 mb-4">Error loading dashboard content</p>
                    <button 
                      onClick={() => window.location.reload()}
                      className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white"
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
          className="bg-white border-t border-gray-200 safe-area-bottom shadow-sm"
        >
          <TabsList className="w-full h-16 grid grid-cols-2 bg-transparent gap-0 p-0">

            
            <TabsTrigger 
              value="scan" 
              className="flex flex-col items-center justify-center gap-0.5 data-[state=active]:bg-gray-50 data-[state=active]:text-gray-900 rounded-none transition-all duration-200 text-gray-600 hover:text-gray-900 h-full"
            >
              <Scan className="h-4 w-4" />
              <span className="text-xs font-medium">Scan</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="closet" 
              onClick={() => console.log('🎯 Closet tab clicked!')}
              className="flex flex-col items-center justify-center gap-0.5 data-[state=active]:bg-gray-50 data-[state=active]:text-gray-900 rounded-none transition-all duration-200 text-gray-600 hover:text-gray-900 h-full"
            >
              <Shirt className="h-4 w-4" />
              <span className="text-xs font-medium">Closet</span>
            </TabsTrigger>
            

          </TabsList>
        </motion.div>
      </Tabs>
    </div>
  );
};

export default Index;
