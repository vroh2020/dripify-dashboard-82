import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScanView } from "@/components/ScanView";
import ClosetView from "@/components/closet/ClosetView";
import { FitsView } from "@/components/fits/FitsView";
import {
  Shirt,
  LayoutGrid,
  Layers,
  Bookmark,
  Plus,
  Upload,
  CalendarDays,
  Scissors,
  Camera,
  X,
} from "lucide-react";
import { Shuffler } from "@/components/whering/shuffler";
import { Wardrobe } from "@/components/whering/wardrobe";
import { Canvas } from "@/components/whering/canvas";
import { Clipper } from "@/components/whering/clipper";
import { UploadItemFlow } from "@/components/whering/UploadItemFlow";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import Profile from "@/pages/Profile";
import { preloadBackgroundRemovalModel } from "@/utils/backgroundRemoval";
import { useClosetData, type ClosetItem } from "@/hooks/useClosetData";
import { useUserGender } from "@/hooks/useUserGender";
import { getGenderedDemoItems } from "@/lib/wardrobe-data";
import { thrust } from "@/lib/haptics";
import { cn } from "@/lib/utils";

// ─── FAB bottom sheet actions ───

type SheetAction = "camera" | "clip" | "create" | "plan";

const sheetItems: {
  key: SheetAction;
  label: string;
  desc: string;
  icon: typeof Upload;
}[] = [
  {
    key: "camera",
    label: "Upload Item",
    desc: "Take a photo and add to your wardrobe",
    icon: Camera,
  },
  {
    key: "clip",
    label: "Clip",
    desc: "Crop & detail from any store",
    icon: Scissors,
  },
  {
    key: "create",
    label: "Create Outfit",
    desc: "Style a look on the canvas",
    icon: Layers,
  },
  {
    key: "plan",
    label: "Plan a Day",
    desc: "Schedule what to wear",
    icon: CalendarDays,
  },
];

function FabBottomSheet({
  open,
  onClose,
  onAction,
}: {
  open: boolean;
  onClose: () => void;
  onAction: (action: SheetAction) => void;
}) {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
    else {
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
        style={{
          backgroundColor: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: open ? 0 : "100%" }}
        transition={{ type: "spring", stiffness: 360, damping: 32 }}
        className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-white pb-10 pt-3 shadow-2xl"
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-gray-200" />
        <div className="flex items-center justify-between px-6 pb-2 pt-1">
          <h2 className="text-lg font-semibold text-gray-900">
            Add to Wardrobe
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4">
          {sheetItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  thrust();
                  onAction(item.key);
                }}
                className="flex w-full items-center gap-4 rounded-2xl px-3 text-left transition-colors active:bg-gray-50"
                style={{ minHeight: 64 }}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="flex-1">
                  <span className="block text-[15px] font-semibold text-gray-900">
                    {item.label}
                  </span>
                  <span className="block text-[13px] text-gray-500">
                    {item.desc}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

// ─── FAB Button ───

function FabButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Add to wardrobe"
      onClick={() => {
        thrust();
        onClick();
      }}
      className="relative z-30 flex items-center justify-center rounded-full bg-black text-white shadow-[0_14px_40px_rgba(0,0,0,0.18)] transition-transform active:scale-95"
      style={{ height: 58, width: 58, marginTop: -29 }}
    >
      <Plus className="h-7 w-7" strokeWidth={2.5} />
    </button>
  );
}

// ─── Main Index ───

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const currentPath = pathSegments[0] ?? "dress-me";

  // Sheet & upload state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [clipperOpen, setClipperOpen] = useState(false);

  // Lift closet data state so UploadItemFlow, Wardrobe, Shuffler, Canvas, and Saved tab share the same instance
  const { items, outfits, isInitialLoad, loadError, retry, refresh, insertItem, saveOutfit, deleteOutfit } = useClosetData();

  // Read user gender from onboarding data so we show gender-appropriate demo items
  const { gender } = useUserGender();
  const demoItems = getGenderedDemoItems(gender);

  const handleItemInserted = useCallback(
    (item: ClosetItem) => {
      insertItem(item);
    },
    [insertItem]
  );

  // Default to dress-me
  useEffect(() => {
    if (location.pathname === "/") {
      navigate("/dress-me", { replace: true });
    }
  }, [location.pathname, navigate]);

  // PRE-LOAD bg removal model (deferred to idle)
  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;
    let idleId: number | undefined;

    const fire = () => {
      if (cancelled) return;
      preloadBackgroundRemovalModel().catch((error) => {
        console.warn(
          "⚠️ Model preload failed (will load on first upload):",
          error
        );
      });
    };

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(fire, { timeout: 4000 });
    } else {
      timeoutId = window.setTimeout(fire, 4000);
    }

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (
        idleId !== undefined &&
        typeof window.cancelIdleCallback === "function"
      ) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, []);

  const handleTabChange = (value: string) => {
    navigate(`/${value}`);
  };

  const handleSheetAction = (action: SheetAction) => {
    setSheetOpen(false);
    if (action === "camera") setUploadOpen(true);
    if (action === "clip") setClipperOpen(true);
    if (action === "create") navigate("/canvas");
    if (action === "plan") navigate("/dress-me");
  };

  // Tab icons + labels for the 4 main tabs
  const tabs: {
    key: string;
    label: string;
    icon: typeof Shirt;
    side: "left" | "right";
  }[] = [
    { key: "dress-me", label: "Dress Me", icon: Shirt, side: "left" },
    { key: "wardrobe", label: "Wardrobe", icon: LayoutGrid, side: "left" },
    { key: "canvas", label: "Canvas", icon: Layers, side: "right" },
    { key: "fits", label: "Saved", icon: Bookmark, side: "right" },
  ];

  const renderContent = () => {
    try {
      switch (currentPath) {
        case "dress-me":
          return (
            <div className="whering-theme bg-muted h-full">
              <Shuffler
                closetItems={items}
                demoItems={demoItems}
                onSaveOutfit={(name, selectedItems, metadata, thumbnail) => {
                  console.log('📦 [Index] Shuffler onSaveOutfit called — items:', selectedItems.length, 'name:', name)
                  return saveOutfit({ name, items: selectedItems, metadata, thumbnail })
                }}
                onSaved={() => {
                  console.log('📍 [Index] onSaved fired — navigating to /fits')
                  navigate("/fits")
                }}
              />
            </div>
          );
        case "wardrobe":
          return (
            <div className="whering-theme bg-muted h-full">
              <Wardrobe items={items} demoItems={demoItems} onRefresh={refresh} />
            </div>
          );
        case "canvas":
          return (
            <div className="whering-theme bg-muted h-full">
              <Canvas
                closetItems={items}
                outfits={outfits}
                demoItems={demoItems}
                onSaveOutfit={(name, selectedItems, metadata, thumbnail) => {
                  console.log('📦 [Index] Canvas onSaveOutfit called — items:', selectedItems.length, 'name:', name)
                  return saveOutfit({ name, items: selectedItems, metadata, thumbnail })
                }}
                onDeleteOutfit={deleteOutfit}
                onSaved={() => {
                  console.log('📍 [Index] onSaved fired — navigating to /fits')
                  navigate("/fits")
                }}
              />
            </div>
          );
        case "fits":
          return (
            <FitsView
              outfits={outfits}
              isInitialLoad={isInitialLoad}
              loadError={loadError}
              onRetry={retry}
              onRefresh={refresh}
              onDeleteOutfit={deleteOutfit}
              onBack={() => navigate("/fits")}
              onEditOutfit={(id) => navigate(`/canvas?edit=${id}`)}
            />
          );
        case "scan":
          return <ScanView />;
        case "closet":
          return <ClosetView />;
        case "profile":
          return <Profile />;
        default:
          return (
            <div className="whering-theme bg-muted h-full">
              <Shuffler
                closetItems={items}
                demoItems={demoItems}
                onSaveOutfit={(name, selectedItems, metadata, thumbnail) => {
                  console.log('📦 [Index] Shuffler onSaveOutfit called — items:', selectedItems.length, 'name:', name)
                  return saveOutfit({ name, items: selectedItems, metadata, thumbnail })
                }}
                onSaved={() => {
                  console.log('📍 [Index] onSaved fired — navigating to /fits')
                  navigate("/fits")
                }}
              />
            </div>
          );
      }
    } catch {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Something went wrong
            </h3>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-black text-white rounded-xl"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
  };

  // ── TEST MODE: dismissible yellow banner ──
  const [testBannerDismissed, setTestBannerDismissed] = useState(false);
  const isTestDashboard =
    typeof window !== 'undefined' &&
    localStorage.getItem('test_dashboard') === 'true';

  const exitTestMode = () => {
    localStorage.removeItem('test_dashboard');
    localStorage.removeItem('onboarding_completed');
    localStorage.removeItem('subscription_active');
    window.location.href = '/auth';
  };

  return (
    // `app-content` opts this wrapper into the iPad letterbox rule
    // (max-width 480px centered with a soft drop shadow) defined in
    // index.css. The inline paddingTop for the iOS Dynamic Island /
    // safe-area is preserved; the parent flex column inside still
    // renders its FAB + tab bar in their existing positions.
    <div
      className="h-full app-content bg-white relative overflow-x-hidden flex flex-col"
      style={{ paddingTop: `env(safe-area-inset-top)` }}
    >
      {/* TEST MODE BANNER */}
      {isTestDashboard && !testBannerDismissed && (
        <div className="flex-shrink-0 bg-yellow-400 text-black px-4 py-2 flex items-center justify-between text-sm font-semibold">
          <span>🧪 TEST MODE — Dashboard Preview</span>
          <div className="flex gap-2">
            <button
              onClick={() => setTestBannerDismissed(true)}
              className="underline text-xs"
            >
              Dismiss
            </button>
            <button
              onClick={exitTestMode}
              className="bg-black text-white px-3 py-0.5 rounded-full text-xs font-bold hover:bg-gray-800"
            >
              Exit Test
            </button>
          </div>
        </div>
      )}

      <DashboardHeader />

      <Tabs
        value={currentPath}
        onValueChange={handleTabChange}
        className="flex flex-col flex-1"
      >
        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {renderContent()}
        </div>

        {/* Bottom Navigation — FAB-centered, with TabsList for accessibility */}
        <div
          className="bg-white/90 backdrop-blur-xl border-t border-gray-200/70 shadow-[0_-1px_3px_rgba(0,0,0,0.03)]"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <TabsList className="w-full h-16 flex items-stretch bg-transparent gap-0 p-0 rounded-none">
              {/* Left tabs (Dress Me, Wardrobe) */}
              <div className="flex flex-1 justify-around">
                {tabs
                  .filter((t) => t.side === "left")
                  .map((t) => {
                    const active = currentPath === t.key;
                    const Icon = t.icon;
                    return (
                      <TabsTrigger
                        key={t.key}
                        value={t.key}
                        aria-label={`${t.label} tab`}
                        className="flex flex-col items-center justify-center gap-0.5 flex-1 data-[state=active]:bg-transparent data-[state=active]:text-black data-[state=active]:shadow-none text-gray-400 hover:text-gray-700 rounded-none h-full transition-colors focus-visible:outline-none"
                      >
                        <Icon
                          className="h-6 w-6 transition-colors"
                          strokeWidth={active ? 2.4 : 1.75}
                        />
                        <span className="text-[10px] font-semibold tracking-wide">
                          {t.label}
                        </span>
                      </TabsTrigger>
                    );
                  })}
              </div>

              {/* FAB spacer */}
              <div className="w-16 flex-shrink-0 flex items-start justify-center">
                <FabButton onClick={() => setSheetOpen(true)} />
              </div>

              {/* Right tabs (Canvas, Saved) */}
              <div className="flex flex-1 justify-around">
                {tabs
                  .filter((t) => t.side === "right")
                  .map((t) => {
                    const active = currentPath === t.key;
                    const Icon = t.icon;
                    return (
                      <TabsTrigger
                        key={t.key}
                        value={t.key}
                        aria-label={`${t.label} tab`}
                        className="flex flex-col items-center justify-center gap-0.5 flex-1 data-[state=active]:bg-transparent data-[state=active]:text-black data-[state=active]:shadow-none text-gray-400 hover:text-gray-700 rounded-none h-full transition-colors focus-visible:outline-none"
                      >
                        <Icon
                          className="h-6 w-6 transition-colors"
                          strokeWidth={active ? 2.4 : 1.75}
                        />
                        <span className="text-[10px] font-semibold tracking-wide">
                          {t.label}
                        </span>
                      </TabsTrigger>
                    );
                  })}
              </div>
            </TabsList>
          </motion.div>
        </div>
      </Tabs>

      {/* FAB Bottom Sheet */}
      <FabBottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAction={handleSheetAction}
      />

      {/* Upload Item Flow */}
      <UploadItemFlow
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onItemInserted={handleItemInserted}
      />

      {/* Clipper overlay */}
      <AnimatePresence>
        {clipperOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-white"
          >
            <div className="whering-theme h-full">
              <Clipper />
            </div>
            <button
              onClick={() => setClipperOpen(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/10 flex items-center justify-center hover:bg-black/20 transition-colors"
              style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
