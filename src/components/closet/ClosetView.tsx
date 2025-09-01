import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Heart, ArrowLeft, Sparkles, Bookmark, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// Import extracted components
import PiecesTab from './PiecesTab';
import FitsTab from './FitsTab';
import CollectionsTab from './CollectionsTab';
import ItemDetailModal from './ItemDetailModal';

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

interface Outfit {
  id: string;
  name: string;
  item_ids: string[];
  score?: number;
  rationale?: string;
  created_at: string;
  items: ClosetItem[];
}

interface FilterChip {
  key: string;
  label: string;
  icon?: React.ComponentType<any>;
}



// Filter data
const FILTER_CHIPS: FilterChip[] = [
  { key: 'all', label: 'All' },
  { key: 'favorites', label: 'Favorites', icon: Heart },
  { key: 'tops', label: 'Tops' },
  { key: 'bottoms', label: 'Bottoms' },
  { key: 'shoes', label: 'Shoes' },
  { key: 'accessories', label: 'Accessories' },
];





export default function ClosetView() {
  const [activeTab, setActiveTab] = useState<'pieces' | 'fits' | 'collections'>('pieces');
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set());
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const [isGeneratingOutfit] = useState(false);
  const [editingOutfit, setEditingOutfit] = useState<Outfit | null>(null);
  const [currentOutfit, setCurrentOutfit] = useState<ClosetItem[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ClosetItem | null>(null);
  const FREE_LIMIT = 10;

  // Load items and outfits from Supabase (real data, no mocks)
  const loadData = useCallback(async () => {
    try {
      console.log('🔄 Loading data from Supabase...');
      const { data: auth, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ Auth error:', authError);
        return;
      }
      
      if (!auth?.user) {
        console.warn('⚠️  No authenticated user found');
        return;
      }

      console.log('✅ User authenticated:', auth.user.id);

      // Load items and outfits in parallel for maximum speed
      console.log('📦 Loading data in parallel...');
      const [itemsResult, outfitsResult] = await Promise.all([
        supabase
          .from('trendza_closet_items')
          .select('id, title, brand, category, color, season, tags, attributes, source_image_url, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('trendza_outfits')
          .select('id, name, item_ids, score, rationale, created_at')
          .order('created_at', { ascending: false })
      ]);
      
      const { data: itemRows, error: itemsErr } = itemsResult;
      const { data: outfitRows, error: outfitsErr } = outfitsResult;
      
      if (itemsErr) {
        console.error('❌ Items load error:', itemsErr);
      } else {
        console.log('📦 Raw items from DB:', itemRows?.length || 0, itemRows);
      }
      
      let normalizedItems: ClosetItem[] = [];
      if (!itemsErr && itemRows) {
        normalizedItems = itemRows
          .filter((r: any) => {
            const hasImage = r.source_image_url;
            const hasValidTitle = r.title && r.title !== 'Untitled' && r.title !== 'Analyzing...';
            console.log(`📋 Item ${r.id}: title="${r.title}", hasImage=${hasImage}, hasValidTitle=${hasValidTitle}`);
            return hasImage && hasValidTitle;
          })
          .map((r: any) => ({
            id: r.id,
            title: r.title,
            brand: r.brand || '',
            category: r.category || 'tops',
            color: r.color || 'unknown',
            season: r.season || 'all',
            tags: Array.isArray(r.tags) ? r.tags : [],
            attributes: r.attributes || {},
            source_image_url: r.source_image_url,
            created_at: r.created_at,
            favorite: false
          }));
        
        console.log('📦 Filtered items:', normalizedItems.length);
        setItems(normalizedItems);
      }
        
      if (outfitsErr) {
        console.error('❌ Outfits load error:', outfitsErr);
      } else {
        console.log('👔 Raw outfits from DB:', outfitRows?.length || 0, outfitRows);
      }
        
      if (!outfitsErr && outfitRows) {
        const itemMap = new Map<string, ClosetItem>();
        normalizedItems.forEach((i: ClosetItem) => itemMap.set(i.id, i));
        const normalizedOutfits: Outfit[] = outfitRows.map((o: any) => ({
          id: o.id,
          name: o.name || 'Fit',
          item_ids: Array.isArray(o.item_ids) ? o.item_ids : [],
          score: o.score || undefined,
          rationale: o.rationale || undefined,
          created_at: o.created_at,
          items: (Array.isArray(o.item_ids) ? o.item_ids : []).map((id: string) => itemMap.get(id)).filter(Boolean) as ClosetItem[]
        }));
        setOutfits(normalizedOutfits);
        console.log('👔 Normalized outfits:', normalizedOutfits.length);
      }
      
      console.log('✅ Data loading complete');
    } catch (e) {
      console.error('❌ Data load error:', e);
    }
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCameraCapture = async () => {
    try {
      setIsUploading(true);
      console.log('📷 Starting camera capture...');

      // Take photo with Capacitor Camera
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      if (!image.dataUrl) {
        console.error('No image data received');
        setIsUploading(false);
        return;
      }

      console.log('📷 Photo captured successfully');

      // Directly save to Supabase without temp states
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        console.warn('Cannot save item: user not authenticated');
        setIsUploading(false);
        return;
      }

      // Convert dataUrl to blob for upload
      const response = await fetch(image.dataUrl);
      const blob = await response.blob();
      
      // Upload image to storage
      const timestamp = Date.now();
      const storagePath = `closet/${auth.user.id}/${timestamp}_no_bg.png`;
      
      console.log('☁️ Uploading image to storage...');
      const imageToUpload = blob;
        
      const { error: uploadErr } = await supabase.storage
        .from('style_images')
        .upload(storagePath, imageToUpload, { cacheControl: '3600', upsert: false });
      
      let publicUrl = image.dataUrl;
      if (!uploadErr) {
        const { data: publicUrlData } = supabase.storage
          .from('style_images')
          .getPublicUrl(storagePath);
        publicUrl = publicUrlData?.publicUrl || image.dataUrl;
        console.log('✅ Image uploaded to storage:', storagePath);
      } else {
        console.warn('Storage upload failed, using local URL:', uploadErr);
      }

      // Try AI analysis for better categorization
      let itemData = {
        title: 'New Item',
        brand: '',
        category: 'tops',
        color: 'unknown',
        season: 'all',
        tags: [] as string[],
        attributes: {}
      };

      try {
        console.log('🤖 Attempting AI analysis...');
        const { data: analysis, error: aiError } = await supabase.functions.invoke('analyze-closet-item', {
          body: { image: image.dataUrl }
        });
        
        if (!aiError && analysis && analysis.category) {
          itemData = {
            title: analysis.title || 'New Item',
            brand: analysis.brand || '',
            category: analysis.category || 'tops',
            color: analysis.color || 'unknown',
            season: analysis.season || 'all',
            tags: analysis.suggestedTags || [],
            attributes: analysis.attributes || {}
          };
          console.log('🎯 AI analysis successful:', itemData);
        }
      } catch (aiError) {
        console.log('📊 AI analysis failed, using defaults:', aiError);
      }

      // Insert to database
      const toInsert = {
        user_id: auth.user.id,
        title: itemData.title,
        brand: itemData.brand,
        category: itemData.category,
        color: itemData.color,
        season: itemData.season,
        tags: itemData.tags,
        attributes: itemData.attributes,
        source_image_url: publicUrl
      };

      console.log('💾 Saving to database...', toInsert);
      const { data: inserted, error: insertErr } = await supabase
        .from('trendza_closet_items')
        .insert(toInsert)
        .select('id, title, brand, category, color, season, tags, attributes, source_image_url, created_at')
        .single();
        
      if (!insertErr && inserted) {
        console.log('✅ Item saved to database with UUID:', inserted.id);
        
        // Create the final item object
        const newItem: ClosetItem = {
          id: inserted.id,
          title: inserted.title,
          brand: inserted.brand || '',
          category: inserted.category,
          color: inserted.color,
          season: inserted.season || 'all',
          tags: Array.isArray(inserted.tags) ? inserted.tags : [],
          attributes: inserted.attributes || {},
          source_image_url: inserted.source_image_url,
          created_at: inserted.created_at,
          favorite: false
        };
        
        // Add to items state
        setItems(prev => [newItem, ...prev]);
        console.log('✅ Item added to local state');
        
      } else {
        console.error('Failed to save item to database:', insertErr);
        throw new Error('Database save failed');
      }
    } catch (error) {
      console.error('❌ Camera capture error:', error);
    } finally {
      setIsUploading(false);
      console.log('📷 Camera capture process completed');
    }
  };

  const generateSmartOutfit = () => {
    if (items.length < 2) return;

    // Group items by category
    const itemsByCategory = {
      tops: items.filter(item => item.category === 'tops'),
      bottoms: items.filter(item => item.category === 'bottoms'),
      shoes: items.filter(item => item.category === 'shoes'),
      accessories: items.filter(item => item.category === 'accessories')
    };

    console.log('📊 Items by category:', itemsByCategory);

    const newOutfit: ClosetItem[] = [];
    
    // Priority order for complete outfits: tops, bottoms, shoes, accessories
    const priorityCategories = ['tops', 'bottoms', 'shoes', 'accessories'] as const;
    
    // First, try to get core items (tops + bottoms OR tops + shoes minimum)
    priorityCategories.forEach(category => {
      const categoryItems = itemsByCategory[category];
      if (categoryItems.length > 0) {
        // Smart selection: pick items that work well together
        const availableItems = categoryItems.filter(item => 
          !newOutfit.some(selected => selected.id === item.id)
        );
        
        if (availableItems.length > 0) {
          const randomIndex = Math.floor(Math.random() * availableItems.length);
          const selectedItem = availableItems[randomIndex];
          if (selectedItem) {
            newOutfit.push(selectedItem);
          }
        }
      }
    });

    // Ensure we have at least a top + something else for a valid outfit
    if (newOutfit.length < 2) {
      const usedIds = new Set(newOutfit.map(item => item.id));
      const remainingItems = items.filter(item => !usedIds.has(item.id));
      
      // Add more items to reach minimum viable outfit
      while (newOutfit.length < Math.min(3, items.length) && remainingItems.length > 0) {
        const randomIndex = Math.floor(Math.random() * remainingItems.length);
        const nextItem = remainingItems[randomIndex];
        if (nextItem) {
          newOutfit.push(nextItem);
          remainingItems.splice(randomIndex, 1);
        } else {
          break;
        }
      }
    }

    console.log('✨ Generated complete outfit:', newOutfit.map(item => `${item.category}: ${item.title}`));
    setCurrentOutfit(newOutfit);
  };

  // Removed floating action generation in favor of clean UI

  // Auto-generate a collage when user navigates to Fits with items present
  useEffect(() => {
    if (activeTab === 'fits' && items.length > 0 && currentOutfit.length === 0) {
      const hasFootwear = items.some(item => item.category === 'shoes');
      if (hasFootwear) {
        generateSmartOutfit();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, items.length]);

  // Save handled via FitStylist

  const toggleFavorite = (itemId: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, favorite: !item.favorite } : item
    ));
  };

  const toggleFilter = (filterKey: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      
      // Handle "all" filter - clear all others
      if (filterKey === 'all') {
        return {};
      }
      
      // Handle category filters - only one category at a time
      if (['tops', 'bottoms', 'shoes', 'accessories'].includes(filterKey)) {
        // Clear other category filters
        ['tops', 'bottoms', 'shoes', 'accessories'].forEach(cat => {
          delete newFilters[cat];
        });
        // Toggle current category
        if (newFilters[filterKey]) {
          delete newFilters[filterKey];
        } else {
          newFilters[filterKey] = 'active';
        }
        return newFilters;
      }
      
      // Handle favorites - can be combined with other filters
      if (filterKey === 'favorites') {
        if (newFilters[filterKey]) {
          delete newFilters[filterKey];
        } else {
          newFilters[filterKey] = 'active';
        }
        return newFilters;
      }
      

      
      return newFilters;
    });
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Check category filters
      const categoryFilters = ['tops', 'bottoms', 'shoes', 'accessories'];
      const hasCategoryFilter = categoryFilters.some(cat => activeFilters[cat]);
      if (hasCategoryFilter && !categoryFilters.some(cat => activeFilters[cat] && item.category === cat)) {
        return false;
      }
      
      // Check favorites filter
      if (activeFilters.favorites && !item.favorite) {
        return false;
      }
      
      return true;
    });
  }, [items, activeFilters]);

  const shuffleOutfits = () => {
    setOutfits(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  const deleteOutfit = async (outfitId: string) => {
    try {
      await supabase.from('trendza_outfits').delete().eq('id', outfitId);
    } catch (e) {
      console.error('Delete outfit failed:', e);
    } finally {
      setOutfits(prev => prev.filter(outfit => outfit.id !== outfitId));
    }
  };

  const editOutfit = (outfit: Outfit) => {
    setEditingOutfit(outfit);
    // Don't change tabs - stay in collections but show detail view
  };

  const handleSaveOutfit = () => {
    // Show success state
    setSaveSuccess(true);
    
    // Clean success feedback
    console.log('✅ Outfit saved successfully!');
    
    // Show success briefly, then navigate back
    setTimeout(() => {
      setActiveTab('pieces');
      setSaveSuccess(false);
      setIsSaving(false);
      setEditingOutfit(null);
    }, 1000);
  };

  // Interface for fit state from FitsTab
  interface FitState {
    headwear: ClosetItem | null;
    tops: ClosetItem | null;
    bottoms: ClosetItem | null;
    footwear: ClosetItem | null;
  }

  const handleSaveFit = async (fitState: FitState, fitName: string) => {
    try {
      setIsSaving(true);
      console.log('💾 Saving fit:', fitName, fitState);

      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        console.error('User not authenticated');
        setIsSaving(false);
        return;
      }

      // Collect all non-null items from the fit and validate UUIDs
      const fitItems = Object.values(fitState).filter(Boolean) as ClosetItem[];
      
      // Filter out any items with temporary IDs
      const validItems = fitItems.filter(item => 
        item.id && 
        !item.id.startsWith('temp_') && 
        item.id.length === 36 // Standard UUID length
      );
      
      if (validItems.length === 0) {
        console.warn('No valid items with proper UUIDs to save');
        setIsSaving(false);
        return;
      }

      console.log('💾 Saving with valid items:', validItems.map(i => ({ id: i.id, title: i.title })));

      // Save to Supabase outfits table
      const { data: inserted, error } = await supabase
        .from('trendza_outfits')
        .insert({
          user_id: auth.user.id,
          name: fitName,
          item_ids: validItems.map(item => item.id),
          score: Math.floor(Math.random() * 30) + 70, // Generate score 70-100
          rationale: 'Created with Fit Stylist'
        })
        .select('id, name, item_ids, score, rationale, created_at')
        .single();

      if (error) {
        console.error('❌ Error saving fit:', error);
        setIsSaving(false);
        return;
      }

      if (inserted) {
        console.log('✅ Fit saved successfully:', inserted.id);
        
        // Add the new outfit to local state
        const newOutfit: Outfit = {
          id: inserted.id,
          name: inserted.name,
          item_ids: inserted.item_ids,
          score: inserted.score,
          rationale: inserted.rationale,
          created_at: inserted.created_at,
          items: validItems
        };
        
        setOutfits(prev => [newOutfit, ...prev]);
        
        // Show success and navigate to Collections
        setSaveSuccess(true);
        setTimeout(() => {
          setActiveTab('collections');
          setSaveSuccess(false);
          setIsSaving(false);
          // Remove unnecessary loadData call - data is already in state
        }, 1500);
      }
    } catch (error) {
      console.error('❌ Save fit error:', error);
      setIsSaving(false);
    }
  };

  // Removed old FitStylistComponent - using optimized FitsTab instead

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Segmented Tabs */}
      {/* Hide segmented tabs while in Fits to maximize canvas */}
      {activeTab !== 'fits' && (
      <div className="bg-white sticky top-0 z-10 border-b border-gray-100">
        <div className="max-w-sm mx-auto px-4 pt-4 pb-4">
          <div className="bg-gray-100 rounded-2xl p-1 grid grid-cols-3 gap-1">
            {(['pieces','fits','collections'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'} rounded-xl py-2 text-sm font-semibold capitalize transition-all`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      <div className="max-w-sm mx-auto px-4 py-6 pb-24">
        {/* Pieces Tab */}
        {activeTab === 'pieces' && (
          <PiecesTab
            items={items}
            filteredItems={filteredItems}
            isUploading={isUploading}
            freeLimit={FREE_LIMIT}
            filterChips={FILTER_CHIPS}
            activeFilters={activeFilters}
            onToggleFilter={toggleFilter}
            onClearFilters={() => setActiveFilters({})}
            onAddPiece={handleCameraCapture}
            onItemClick={setSelectedItem}
            onToggleFavorite={toggleFavorite}
          />
        )}




        {/* Fits Tab */}
        {activeTab === 'fits' && !editingOutfit && (
          <FitsTab
            items={items}
            isSaving={isSaving}
            saveSuccess={saveSuccess}
            onSaveFit={handleSaveFit}
            onSetActiveTab={setActiveTab}
          />
        )}

        {/* Fit Stylist Modal */}


        {/* Collections Tab */}
                {activeTab === 'collections' && !editingOutfit && (
          <CollectionsTab 
            outfits={outfits}
            onEditOutfit={editOutfit}
            onDeleteOutfit={deleteOutfit}
            onOpenFitStylist={() => setActiveTab('fits')}
          />
        )}

        {activeTab === 'collections' && editingOutfit && (
          <div className="min-h-screen bg-white">
            {/* Clean Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={() => setEditingOutfit(null)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-700" />
                </motion.button>
                <h1 className="text-xl font-bold text-gray-900">{editingOutfit.name}</h1>
              </div>
            </div>

            {/* Clean Outfit Display */}
            <div className="max-w-sm mx-auto px-6 py-8">
              <div className="relative min-h-[70vh] flex flex-col items-center justify-center bg-gray-50 rounded-3xl py-16">
                {editingOutfit.items.map((item, index) => (
                  <motion.div 
                    key={item.id}
                    className="mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <div className="w-40 h-40 rounded-3xl overflow-hidden bg-white shadow-xl border-4 border-white">
                      <img 
                        src={item.source_image_url || ''} 
                        alt={item.title}
                        className="w-full h-full object-contain p-3"
                      />
                    </div>
                    <p className="text-center mt-3 font-medium text-gray-700">{item.title}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Item Detail Modal */}
        <AnimatePresence>
          <ItemDetailModal
            item={selectedItem}
            isOpen={!!selectedItem}
            onClose={() => setSelectedItem(null)}
            onToggleFavorite={toggleFavorite}
          />
        </AnimatePresence>

        {/* Inline Fit Stylist will render in the Fits tab when there are no saved outfits */}
      </div>


    </div>
  );
}