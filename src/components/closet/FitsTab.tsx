  import { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react';
  import { motion, AnimatePresence } from 'framer-motion';
  import { Bookmark, Shuffle, Sparkles, Loader2 } from 'lucide-react';
  import { supabase } from '@/integrations/supabase/client';

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

// Memoized item categorization - only recalculates when items change
const useCategorizedItems = (items: ClosetItem[]) => {
  // Async non-blocking image preloading - moved inside the hook
  const preloadImages = useCallback(async (items: ClosetItem[]) => {
    // Use requestIdleCallback for non-blocking preload, fallback to setTimeout
    const schedulePreload = (callback: () => void) => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(callback, { timeout: 2000 });
      } else {
        setTimeout(callback, 0);
      }
    };

    schedulePreload(() => {
      items.forEach(item => {
        if (item.source_image_url && !imageCache.has(item.source_image_url)) {
          const img = new Image();
          img.loading = 'lazy'; // Changed to lazy for non-blocking
          img.fetchPriority = 'low'; // Lower priority for background preloading
          img.src = item.source_image_url;
          imageCache.set(item.source_image_url, img);
        }
      });
    });
  }, []);
    const categorized = useMemo(() => {
      const headwearItems = items.filter(item => 
        item.category === 'accessories' && 
        (item.title.toLowerCase().includes('hat') || 
        item.title.toLowerCase().includes('cap') || 
        item.title.toLowerCase().includes('beanie'))
      );
      const topItems = items.filter(item => item.category === 'tops');
      const bottomItems = items.filter(item => item.category === 'bottoms');
      const footwearItems = items.filter(item => item.category === 'shoes');
      
      return { headwearItems, topItems, bottomItems, footwearItems };
    }, [items]);

  // Preload images asynchronously after categorization (non-blocking)
  useEffect(() => {
    preloadImages([...categorized.headwearItems, ...categorized.topItems, ...categorized.bottomItems, ...categorized.footwearItems]);
  }, [categorized, preloadImages]);

  return { ...categorized, preloadImages };
};

  // Ultra-fast image component with instant loading and click-to-shuffle
  const FitItemImage = memo(({ 
    item, 
    category, 
    onShuffle,
    itemKey 
  }: { 
    item: ClosetItem; 
    category: 'headwear' | 'tops' | 'bottoms' | 'footwear';
    onShuffle: () => void;
    itemKey: number;
  }) => {
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
        <div 
          onClick={onShuffle}
          className="w-36 h-36 flex items-center justify-center bg-gray-100 rounded-xl cursor-pointer active:scale-95 transition-transform"
        >
          <span className="text-gray-400 text-sm">Image Error</span>
        </div>
      );
    }

    return (
      <motion.div 
        className="w-36 h-36 flex items-center justify-center cursor-pointer relative group"
        onClick={onShuffle}
        whileTap={{ scale: 0.95 }}
        key={`${category}-${itemKey}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.05 }}
      >
        {!imageLoaded && (
          <div className="w-36 h-36 bg-gray-100 rounded-xl animate-pulse" />
        )}
        <img 
          ref={imgRef}
          key={`${category}-${item.id}-${itemKey}`}
          src={item.source_image_url || ''} 
          alt={item.title}
          className={`max-w-full max-h-full object-contain transition-opacity duration-75 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="eager"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
        {/* Shuffle hint overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 rounded-xl transition-colors flex items-center justify-center">
          <Shuffle className="w-6 h-6 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </motion.div>
    );
  });

  FitItemImage.displayName = 'FitItemImage';

const FitsTabComponent = ({
  items,
  isSaving,
  saveSuccess,
  onSaveFit,
  onSetActiveTab
}: FitsTabProps) => {
  // Memoized categorized items with instant preloading
  const { headwearItems, topItems, bottomItems, footwearItems, preloadImages } = useCategorizedItems(items);

    // Current fit state - what's selected for each category
    const [currentFit, setCurrentFit] = useState<FitState>({
      headwear: null,
      tops: null,
      bottoms: null,
      footwear: null,
    });

    const [fitName, setFitName] = useState('');
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showGenerationModal, setShowGenerationModal] = useState(false);
    const [fitTypeInput, setFitTypeInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const categoryKeyRef = useRef({
      headwear: 0,
      tops: 0,
      bottoms: 0,
      footwear: 0
    });

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

    // INSTANT random piece selector - zero delays
    const getRandomPiece = useCallback((categoryItems: ClosetItem[], currentItem: ClosetItem | null) => {
      if (categoryItems.length === 0) return null;
      if (categoryItems.length === 1) return categoryItems[0];
      
      // Ultra-fast random selection
      const randomIndex = Math.floor((performance.now() * 1000) % categoryItems.length);
      let newItem = categoryItems[randomIndex];
      
      // Get different item if same as current
      if (categoryItems.length > 1 && newItem?.id === currentItem?.id) {
        const nextIndex = (randomIndex + 1) % categoryItems.length;
        newItem = categoryItems[nextIndex];
      }
      return newItem;
    }, []);

    // INSTANT shuffle individual category
    const shuffleCategory = useCallback((category: 'headwear' | 'tops' | 'bottoms' | 'footwear') => {
      const categoryMap = {
        headwear: headwearItems,
        tops: topItems,
        bottoms: bottomItems,
        footwear: footwearItems
      };

      const items = categoryMap[category];
      const newItem = getRandomPiece(items, currentFit[category]);

      // Preload image instantly
      if (newItem?.source_image_url) preloadImages([newItem]);

      // INSTANT state update - no delays
      setCurrentFit(prev => ({
        ...prev,
        [category]: newItem
      }));

      // Update key for animation
      categoryKeyRef.current[category] += 1;
    }, [headwearItems, topItems, bottomItems, footwearItems, currentFit, getRandomPiece, preloadImages]);

    // INSTANT shuffle entire outfit - zero delays
    const shuffleOutfit = useCallback(() => {
      const nextFit = {
        headwear: getRandomPiece(headwearItems, currentFit.headwear) || null,
        tops: getRandomPiece(topItems, currentFit.tops) || null,
        bottoms: getRandomPiece(bottomItems, currentFit.bottoms) || null,
        footwear: getRandomPiece(footwearItems, currentFit.footwear) || null,
      };

      // Preload all images instantly
      if (nextFit.headwear?.source_image_url) preloadImages([nextFit.headwear]);
      if (nextFit.tops?.source_image_url) preloadImages([nextFit.tops]);
      if (nextFit.bottoms?.source_image_url) preloadImages([nextFit.bottoms]);
      if (nextFit.footwear?.source_image_url) preloadImages([nextFit.footwear]);

      // INSTANT state update - zero delays, no animation blocking
      setCurrentFit(nextFit);

      // Update all keys
      Object.keys(categoryKeyRef.current).forEach(key => {
        categoryKeyRef.current[key as keyof typeof categoryKeyRef.current] += 1;
      });
    }, [headwearItems, topItems, bottomItems, footwearItems, currentFit, getRandomPiece, preloadImages]);

    // Swipe gesture handler - detect left swipe (instant trigger)
    const handleDragEnd = useCallback((_event: any, info: any) => {
      const swipeThreshold = 30; // Lower threshold for easier swiping
      const velocityThreshold = 300; // Lower velocity for quick swipes
      
      // Detect left swipe (negative x) - instant shuffle
      if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
        shuffleOutfit();
      }
    }, [shuffleOutfit]);

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

    // Generate outfit using AI
    const handleGenerateOutfit = async () => {
      if (!fitTypeInput.trim() || isGenerating) return;

      setIsGenerating(true);
      try {
        // Call the bright-processor Supabase function (deployed function name)
        const { data, error } = await supabase.functions.invoke('bright-processor', {
          body: {
            occasion: fitTypeInput.trim(),
            closet_items: items.map(item => ({
              id: item.id,
              title: item.title,
              category: item.category,
              brand: item.brand,
              color: item.color,
              season: item.season,
              tags: item.tags || [],
              attributes: item.attributes || {}
            }))
          }
        });

        if (error) {
          console.error('Error generating outfit:', error);
          const errorMessage = error.message?.includes('CORS') || error.message?.includes('Failed to send')
            ? 'Unable to connect to outfit generation service. Please check your connection and try again.'
            : 'Failed to generate outfit. Please try again.';
          alert(errorMessage);
          return;
        }

        if (data && data.outfits && data.outfits.length > 0) {
          // Get the first generated outfit
          const generatedOutfit = data.outfits[0];
          
          // Map the generated item IDs back to actual items
          const outfitItems = generatedOutfit.item_ids
            .map((id: string) => items.find(item => item.id === id))
            .filter(Boolean) as ClosetItem[];

          // Categorize items and set the fit
          const newFit: FitState = {
            headwear: outfitItems.find(item => 
              item.category === 'accessories' && 
              (item.title.toLowerCase().includes('hat') || 
               item.title.toLowerCase().includes('cap') || 
               item.title.toLowerCase().includes('beanie'))
            ) || null,
            tops: outfitItems.find(item => item.category === 'tops') || null,
            bottoms: outfitItems.find(item => item.category === 'bottoms') || null,
            footwear: outfitItems.find(item => item.category === 'shoes') || null,
          };

          setCurrentFit(newFit);
          setShowGenerationModal(false);
          setFitTypeInput('');
        } else {
          alert('No outfit could be generated. Please try a different description.');
        }
      } catch (err: any) {
        console.error('Error generating outfit:', err);
        const errorMessage = err?.message?.includes('CORS') || err?.message?.includes('Failed to send')
          ? 'Unable to connect to outfit generation service. The function may need to be deployed. Please try again later.'
          : 'Failed to generate outfit. Please try again.';
        alert(errorMessage);
      } finally {
        setIsGenerating(false);
      }
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
            <div className="flex items-center justify-center gap-3 p-4 border-b border-gray-100">
              <button
                onClick={() => setShowGenerationModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-900 transition-all duration-200 active:scale-95"
                style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Outfit Generation</span>
              </button>
              
              <button
                onClick={shuffleOutfit}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-900 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all duration-200 active:scale-95"
                style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Shuffle All</span>
              </button>
              
              <button
                onClick={() => setShowSaveModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-900 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all duration-200 active:scale-95"
                style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Save Fit</span>
              </button>
            </div>

            {/* Fit Display - Ultra Clean Vertical Stack with Swipe Support */}
            <motion.div 
              className="flex-1 flex items-center justify-center p-6 w-full cursor-grab active:cursor-grabbing"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              dragDirectionLock={true}
              onDragEnd={handleDragEnd}
              whileDrag={{ scale: 0.98, opacity: 0.9 }}
              style={{ touchAction: 'pan-y pinch-zoom' }}
            >
              <div className="flex flex-col items-center space-y-6">
                {/* Headwear - click to shuffle */}
                {currentFit.headwear && (
                  <FitItemImage 
                    item={currentFit.headwear} 
                    category="headwear"
                    onShuffle={() => shuffleCategory('headwear')}
                    itemKey={categoryKeyRef.current.headwear}
                  />
                )}
                
                {/* Tops - click to shuffle */}
                {currentFit.tops && (
                  <FitItemImage 
                    item={currentFit.tops} 
                    category="tops"
                    onShuffle={() => shuffleCategory('tops')}
                    itemKey={categoryKeyRef.current.tops}
                  />
                )}
                
                {/* Bottoms - click to shuffle */}
                {currentFit.bottoms && (
                  <FitItemImage 
                    item={currentFit.bottoms} 
                    category="bottoms"
                    onShuffle={() => shuffleCategory('bottoms')}
                    itemKey={categoryKeyRef.current.bottoms}
                  />
                )}
                
                {/* Footwear - click to shuffle */}
                {currentFit.footwear && (
                  <FitItemImage 
                    item={currentFit.footwear} 
                    category="footwear"
                    onShuffle={() => shuffleCategory('footwear')}
                    itemKey={categoryKeyRef.current.footwear}
                  />
                )}
              </div>
            </motion.div>
            
            {/* Subtle hints */}
            <div className="text-center pb-4">
              <p className="text-xs text-gray-400">Tap item to shuffle • Swipe left for all</p>
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

        {/* Outfit Generation Modal */}
        <AnimatePresence>
          {showGenerationModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => !isGenerating && setShowGenerationModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-6 w-full max-w-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">AI Outfit Generation</h3>
                  <p className="text-gray-600">What type of fit do you want?</p>
                </div>

                <input
                  type="text"
                  value={fitTypeInput}
                  onChange={(e) => setFitTypeInput(e.target.value)}
                  placeholder="e.g., casual, formal, workout, date night..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none transition-colors mb-6"
                  autoFocus
                  disabled={isGenerating}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isGenerating) {
                      handleGenerateOutfit();
                    }
                  }}
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowGenerationModal(false);
                      setFitTypeInput('');
                    }}
                    disabled={isGenerating}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateOutfit}
                    disabled={!fitTypeInput.trim() || isGenerating}
                    className="flex-1 py-3 px-4 bg-black text-white rounded-xl font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate'
                    )}
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
  };

  // Memoize component to prevent unnecessary re-renders
  export default memo(FitsTabComponent, (prevProps, nextProps) => {
    // Only re-render if items array actually changed (by reference or length/content)
    const itemsEqual = 
      prevProps.items === nextProps.items ||
      (prevProps.items.length === nextProps.items.length &&
       prevProps.items.every((item, idx) => item.id === nextProps.items[idx]?.id));
    
    return (
      itemsEqual &&
      prevProps.isSaving === nextProps.isSaving &&
      prevProps.saveSuccess === nextProps.saveSuccess
    );
  });
