  import { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react';
  import { motion, AnimatePresence } from 'framer-motion';
  import { ArrowLeft, Bookmark, Shuffle } from 'lucide-react';

  interface ClosetItem {
    id: string;
    title: string;
    brand?: string;
    category: string;
    color: string;
    season?: string;
    tags: string[];
    attributes: Record<string, any>;
    source_image_url?: string;
    created_at: string;
    favorite?: boolean;
  }

  interface FitState {
    headwear: ClosetItem | null;
    tops: ClosetItem | null;
    bottoms: ClosetItem | null;
    footwear: ClosetItem | null;
  }

  interface FitsTabProps {
    items: ClosetItem[];
    isSaving: boolean;
    saveSuccess: boolean;
    onSaveFit: (fitState: FitState, fitName: string) => Promise<void>;
    onSetActiveTab: (tab: 'pieces' | 'fits' | 'collections') => void;
  }

  // Ultra-fast image cache for instant loading
  const imageCache = new Map<string, HTMLImageElement>();

  // Preload all images instantly
  const preloadImages = (items: ClosetItem[]) => {
    items.forEach(item => {
      if (item.source_image_url && !imageCache.has(item.source_image_url)) {
        const img = new Image();
        img.src = item.source_image_url;
        imageCache.set(item.source_image_url, img);
      }
    });
  };

  // Memoized item categorization - only recalculates when items change
  const useCategorizedItems = (items: ClosetItem[]) => {
    return useMemo(() => {
      const headwearItems = items.filter(item => 
        item.category === 'accessories' && 
        (item.title.toLowerCase().includes('hat') || 
        item.title.toLowerCase().includes('cap') || 
        item.title.toLowerCase().includes('beanie'))
      );
      const topItems = items.filter(item => item.category === 'tops');
      const bottomItems = items.filter(item => item.category === 'bottoms');
      const footwearItems = items.filter(item => item.category === 'shoes');
      
      // Preload all images for instant display
      preloadImages([...headwearItems, ...topItems, ...bottomItems, ...footwearItems]);
      
      return { headwearItems, topItems, bottomItems, footwearItems };
    }, [items]);
  };

  // Ultra-fast image component with instant loading
  const FitItemImage = memo(({ item, category }: { item: ClosetItem; category: string }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // Instant image loading - no delays
    useEffect(() => {
      if (item.source_image_url) {
        // Check if image is already cached
        const cachedImg = imageCache.get(item.source_image_url);
        if (cachedImg && cachedImg.complete) {
          setImageLoaded(true);
          return;
        }

        // Load instantly if not cached
        const img = new Image();
        img.onload = () => {
          setImageLoaded(true);
          imageCache.set(item.source_image_url!, img);
        };
        img.onerror = () => setImageError(true);
        img.src = item.source_image_url;
      }
    }, [item.source_image_url]);

    if (imageError) {
      return (
        <div className="w-36 h-36 flex items-center justify-center bg-gray-100 rounded-xl">
          <span className="text-gray-400 text-sm">Image Error</span>
        </div>
      );
    }

    return (
      <div className="w-36 h-36 flex items-center justify-center">
        {!imageLoaded && (
          <div className="w-36 h-36 bg-gray-100 rounded-xl animate-pulse" />
        )}
        <img 
          ref={imgRef}
          key={`${category}-${item.id}`}
          src={item.source_image_url || ''} 
          alt={item.title}
          className={`max-w-full max-h-full object-contain transition-opacity duration-100 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="eager"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      </div>
    );
  });

  FitItemImage.displayName = 'FitItemImage';

  export default function FitsTab({
    items,
    isSaving,
    saveSuccess,
    onSaveFit,
    onSetActiveTab
  }: FitsTabProps) {
    // Memoized categorized items with instant preloading
    const { headwearItems, topItems, bottomItems, footwearItems } = useCategorizedItems(items);

    // Current fit state - what's selected for each category
    const [currentFit, setCurrentFit] = useState<FitState>({
      headwear: null,
      tops: null,
      bottoms: null,
      footwear: null,
    });

    const [fitName, setFitName] = useState('');
    const [showSaveModal, setShowSaveModal] = useState(false);

    // Initialize fit state only once when items are first loaded
    useEffect(() => {
      if (items.length > 0 && !currentFit.tops && !currentFit.bottoms) {
        setCurrentFit({
          headwear: headwearItems[0] || null,
          tops: topItems[0] || null,
          bottoms: bottomItems[0] || null,
          footwear: footwearItems[0] || null,
        });
      }
    }, [items.length, headwearItems.length, topItems.length, bottomItems.length, footwearItems.length]);

    // ULTRA-FAST shuffle function - instant state update
    const shuffleOutfit = useCallback(() => {
      // Instant random selection - no delays
      const getRandomPiece = (categoryItems: ClosetItem[]) => {
        if (categoryItems.length === 0) return null;
        return categoryItems[Math.floor(Math.random() * categoryItems.length)];
      };

      // Instant state update - zero delays
      setCurrentFit({
        headwear: getRandomPiece(headwearItems) || null,
        tops: getRandomPiece(topItems) || null,
        bottoms: getRandomPiece(bottomItems) || null,
        footwear: getRandomPiece(footwearItems) || null,
      });
    }, [headwearItems, topItems, bottomItems, footwearItems]);

    const handleSave = async () => {
      if (!fitName.trim()) return;
      
      // Filter out null items and ensure we have valid UUIDs
      const validFit: FitState = {
        headwear: currentFit.headwear && !currentFit.headwear.id.startsWith('temp_') ? currentFit.headwear : null,
        tops: currentFit.tops && !currentFit.tops.id.startsWith('temp_') ? currentFit.tops : null,
        bottoms: currentFit.bottoms && !currentFit.bottoms.id.startsWith('temp_') ? currentFit.bottoms : null,
        footwear: currentFit.footwear && !currentFit.footwear.id.startsWith('temp_') ? currentFit.footwear : null,
      };

      await onSaveFit(validFit, fitName);
      setFitName('');
      setShowSaveModal(false);
    };

    return (
      <div className="flex-1 bg-white min-h-screen">
        {/* Empty State - Show when no items */}
        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6 min-h-screen">
            <div className="text-center">
              <p className="text-xl font-semibold text-gray-400 mb-2">No pieces in closet</p>
              <p className="text-gray-500 mb-6">Go to Outfits tab to add items</p>
              <button
                onClick={() => onSetActiveTab('pieces')}
                className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-900 transition-colors"
              >
                Go to Outfits
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header with functional buttons */}
            <div className="flex items-center justify-end p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <button
                  onClick={shuffleOutfit}
                  className="flex items-center px-4 py-2 bg-gray-200 text-black rounded-xl font-medium hover:bg-gray-300 transition-colors"
                >
                  <Shuffle className="w-4 h-4 mr-2" />
                  Shuffle
                </button>
                
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  <Bookmark className="w-4 h-4 mr-2" />
                  Save Fit
                </button>
              </div>
            </div>

            {/* Fit Display - Ultra Clean Vertical Stack */}
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="flex flex-col items-center space-y-6">
                {/* Headwear - floating image, fixed size */}
                {currentFit.headwear && (
                  <FitItemImage item={currentFit.headwear} category="headwear" />
                )}
                
                {/* Tops - floating image, fixed size */}
                {currentFit.tops && (
                  <FitItemImage item={currentFit.tops} category="tops" />
                )}
                
                {/* Bottoms - floating image, fixed size */}
                {currentFit.bottoms && (
                  <FitItemImage item={currentFit.bottoms} category="bottoms" />
                )}
                
                {/* Footwear - floating image, fixed size */}
                {currentFit.footwear && (
                  <FitItemImage item={currentFit.footwear} category="footwear" />
                )}
              </div>
            </div>
          </>
        )}

        {/* Save Modal */}
        <AnimatePresence>
          {showSaveModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowSaveModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-6 w-full max-w-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <Bookmark className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Save Your Fit</h3>
                  <p className="text-gray-600">Give your outfit a name</p>
                </div>

                <input
                  type="text"
                  value={fitName}
                  onChange={(e) => setFitName(e.target.value)}
                  placeholder="e.g., Casual Friday, Date Night..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none transition-colors mb-6"
                  autoFocus
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!fitName.trim() || isSaving}
                    className="flex-1 py-3 px-4 bg-gray-200 text-black rounded-xl font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSaving ? 'Saving...' : 'Save Fit'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success State */}
        <AnimatePresence>
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed top-4 right-4 bg-gray-200 text-black px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50"
            >
              ✅ Fit saved!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
