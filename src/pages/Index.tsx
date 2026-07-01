import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScanView } from "@/components/ScanView";
import ClosetView from "@/components/closet/ClosetView";
import { FitsView } from "@/components/fits/FitsView";
import { Scan, Shirt, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import Profile from "@/pages/Profile";
import { preloadBackgroundRemovalModel } from "@/utils/backgroundRemoval";


const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Top-level route segment: only the first path part is a tab. The
  // remaining segments route inside the view (e.g. `/fits/builder`).
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentPath = pathSegments[0] ?? 'scan';

  // `/` lands the user on Scan, which is also the dashboard / home.
  useEffect(() => {
    if (location.pathname === '/') {
      navigate('/scan', { replace: true });
    }
  }, [location.pathname, navigate]);

  // 🚀 PRE-LOAD MODEL but only after the browser is idle, so a 100MB+ ONNX
  // download doesn't compete with the user's first taps / haptics / animations.
  // requestIdleCallback is fire-and-forget on unmount (browsers can't cancel
  // it) — the body-level `cancelled` flag is the only post-unmount guard.
  // Safari/WebView older than iOS 16.4 falls back to a 4s setTimeout.
  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;
    let idleId: number | undefined;

    const fire = () => {
      if (cancelled) return;
      preloadBackgroundRemovalModel().catch((error) => {
        console.warn('⚠️ Model preload failed (will load on first upload):', error);
      });
    };

    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(fire, { timeout: 4000 });
    } else {
      timeoutId = window.setTimeout(fire, 4000);
    }

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (idleId !== undefined && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
    };
  }, []); // Run once when dashboard mounts, but deferred to idle.

  const handleTabChange = (value: string) => {
    navigate(`/${value}`);
  };

  // Top-level tab dispatch. Sub-routes (e.g. `/fits/builder`, `/closet/collections`)
  // are handled inside each view component via `useLocation()` parse.
  const renderContent = () => {
    try {
      switch (currentPath) {
        case 'scan':
          return <ScanView />;
        case 'closet':
          return <ClosetView />;
        case 'fits':
          return <FitsView />;
        case 'profile':
          return <Profile />;

        default:
          return <ScanView />;
      }
    } catch (error) {
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
      
      <Tabs value={currentPath} onValueChange={handleTabChange} className="flex flex-col" style={{ height: 'calc(100dvh - 56px - env(safe-area-inset-top, 0px))' }}>
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {(() => {
            try {
              return renderContent();
            } catch (error) {
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

        {/* Bottom Navigation — uses `.nav-height` from index.css so it
            * always has 64px of content + safe-area-inset-bottom padding
            * for the home indicator on every iPhone (SE through 15 Pro Max
            * + Dynamic Island). A subtle top border + a translucent blur
            * background gives the iOS-native "tab bar over content" feel. */}
        <div
          className="bg-white/85 backdrop-blur-lg border-t border-gray-200/80 shadow-[0_-1px_3px_rgba(0,0,0,0.04)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <TabsList className="w-full h-16 grid grid-cols-3 bg-transparent gap-0 p-0">
              <TabsTrigger
                value="closet"
                aria-label="Closet tab"
                className="flex flex-col items-center justify-center gap-1 data-[state=active]:bg-transparent data-[state=active]:text-black data-[state=active]:shadow-none text-gray-500 hover:text-gray-900 rounded-none h-full transition-colors focus-visible:outline-none focus-visible:bg-gray-100"
              >
                <Shirt className="h-5 w-5" strokeWidth={1.75} />
                <span className="text-[11px] font-semibold tracking-wide">Closet</span>
              </TabsTrigger>
              <TabsTrigger
                value="fits"
                aria-label="Fits tab"
                className="flex flex-col items-center justify-center gap-1 data-[state=active]:bg-transparent data-[state=active]:text-black data-[state=active]:shadow-none text-gray-500 hover:text-gray-900 rounded-none h-full transition-colors focus-visible:outline-none focus-visible:bg-gray-100"
              >
                <Sparkles className="h-5 w-5" strokeWidth={1.75} />
                <span className="text-[11px] font-semibold tracking-wide">Fits</span>
              </TabsTrigger>
              <TabsTrigger
                value="scan"
                aria-label="Scan tab"
                className="flex flex-col items-center justify-center gap-1 data-[state=active]:bg-transparent data-[state=active]:text-black data-[state=active]:shadow-none text-gray-500 hover:text-gray-900 rounded-none h-full transition-colors focus-visible:outline-none focus-visible:bg-gray-100"
              >
                <Scan className="h-5 w-5" strokeWidth={1.75} />
                <span className="text-[11px] font-semibold tracking-wide">Scan</span>
              </TabsTrigger>
            </TabsList>
          </motion.div>
        </div>
      </Tabs>
    </div>
  );
};

export default Index;
