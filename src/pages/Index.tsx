import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Unused imports removed for clean 3-pillar architecture
import { ColorAnalysisView } from "@/features/color/ColorAnalysisView";
import { ClosetView } from "@/features/closet/ClosetView";
import { ShoppingView } from "@/features/shopping/ShoppingView";
import { Palette, Shirt, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
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
      navigate('/colors', { replace: true });
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
        case 'colors':
          return <ColorAnalysisView />;
        case 'closet':
          return <ClosetView />;
        case 'search':
          return <ShoppingView />;
        case 'profile':
          return <Profile />;
        default:
          return <ColorAnalysisView />;
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
      className="min-h-[100dvh] bg-white relative overflow-x-hidden"
      style={{ paddingTop: `calc(env(safe-area-inset-top) + 8px)` }}
    >
      
      <Tabs value={currentPath} onValueChange={handleTabChange} className="flex flex-col h-full">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-8">
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

        {/* Bottom Navigation - Clean 3-Pillar Design */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white border-t border-gray-100 fixed bottom-0 left-0 right-0 z-50"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <TabsList className="!flex !h-10 !w-full !grid !grid-cols-3 !bg-transparent !gap-0 !p-0 !border-0 !rounded-none !text-black">
            <TabsTrigger 
              value="colors" 
              className="!flex !flex-col !items-center !justify-center !gap-0.5 !data-[state=active]:!text-black !data-[state=active]:!bg-transparent !rounded-none !transition-all !duration-200 !text-gray-500 hover:!text-gray-700 !h-full !px-0 !py-1 !text-xs !font-medium"
            >
              <Palette className="h-4 w-4" />
              <span className="text-xs font-medium">Colors</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="closet" 
              className="!flex !flex-col !items-center !justify-center !gap-0.5 !data-[state=active]:!text-black !data-[state=active]:!bg-transparent !rounded-none !transition-all !duration-200 !text-gray-500 hover:!text-gray-700 !h-full !px-0 !py-1 !text-xs !font-medium"
            >
              <Shirt className="h-4 w-4" />
              <span className="text-xs font-medium">Closet</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="search" 
              className="!flex !flex-col !items-center !justify-center !gap-0.5 !data-[state=active]:!text-black !data-[state=active]:!bg-transparent !rounded-none !transition-all !duration-200 !text-gray-500 hover:!text-gray-700 !h-full !px-0 !py-1 !text-xs !font-medium"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="text-xs font-medium">Shopping</span>
            </TabsTrigger>
          </TabsList>
        </motion.div>
      </Tabs>
    </div>
  );
};

export default Index;
