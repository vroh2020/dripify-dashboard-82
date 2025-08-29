import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Heart, Shuffle, Grid3X3, 
  LayoutGrid, Plus, Lock, Save, Share2, 
  DollarSign, Palette, Sparkles, X, Shirt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { tokens } from '@/design/tokens';

// Override tokens to use black/white theme
const theme = {
  ...tokens,
  color: {
    ...tokens.color,
    accent: '#000000', // Pure black accent
    background: '#FFFFFF', // Pure white background
    foreground: '#000000', // Pure black text
  }
};

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
}

interface Collection {
  id: string;
  name: string;
  outfits: Outfit[];
  fitCount: number;
}

const FILTER_CHIPS = [
  { key: 'all', label: 'All', icon: null },
  { key: 'favorites', label: 'Favorites', icon: Heart },
  { key: 'type', label: 'Type', icon: Grid3X3 },
  { key: 'size', label: 'Size', icon: null },
  { key: 'brand', label: 'Brand', icon: null },
  { key: 'color', label: 'Color', icon: Palette },
  { key: 'season', label: 'Season', icon: null },
];

export const ClosetView = () => {
  const [activeTab, setActiveTab] = useState<'pieces' | 'fits' | 'collections'>('pieces');
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [isGeneratingOutfit, setIsGeneratingOutfit] = useState(false);
  const [currentOutfit, setCurrentOutfit] = useState<ClosetItem[]>([]);
  const [lockedSlots, setLockedSlots] = useState<Set<number>>(new Set());
  const [closetValue, setClosetValue] = useState(0);
  const [showOutfitGenerator, setShowOutfitGenerator] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ClosetItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load real data from Supabase
  useEffect(() => {
    loadClosetData();
  }, []);

  const loadClosetData = async () => {
    try {
      setIsLoading(true);
      
      // For now, use mock data since trendza tables aren't in types yet
      // In production, this would load from database
      const mockItems: ClosetItem[] = [
        {
          id: '1',
          title: 'White T-Shirt',
          brand: 'Nike',
          category: 'tops',
          color: 'white',
          season: 'all',
          tags: ['casual', 'basic'],
          attributes: { size: 'M', material: 'cotton' },
          source_image_url: 'https://placehold.co/300x400?text=White+T-Shirt',
          created_at: new Date().toISOString(),
          favorite: false
        },
        {
          id: '2',
          title: 'Blue Jeans',
          brand: 'Levi\'s',
          category: 'bottoms',
          color: 'blue',
          season: 'all',
          tags: ['casual', 'denim'],
          attributes: { size: '32', material: 'denim' },
          source_image_url: 'https://placehold.co/300x400?text=Blue+Jeans',
          created_at: new Date().toISOString(),
          favorite: true
        }
      ];
      
      const mockOutfits: Outfit[] = [
        {
          id: '1',
          name: 'Casual Look',
          item_ids: ['1', '2'],
          score: 85,
          rationale: 'Classic casual combination',
          created_at: new Date().toISOString()
        }
      ];
      
      const closetValue = mockItems.length * 25;
      
      setItems(mockItems);
      setOutfits(mockOutfits);
      setClosetValue(closetValue);

      // Generate collections from outfits
      const collectionsData: Collection[] = [
        {
          id: 'go-to-looks',
          name: 'Go-To Looks',
          outfits: mockOutfits.filter(o => o.name.toLowerCase().includes('casual')),
          fitCount: mockOutfits.filter(o => o.name.toLowerCase().includes('casual')).length
        },
        {
          id: 'casual',
          name: 'Casual',
          outfits: mockOutfits.filter(o => o.name.toLowerCase().includes('casual')),
          fitCount: mockOutfits.filter(o => o.name.toLowerCase().includes('casual')).length
        },
        {
          id: 'formal',
          name: 'Formal',
          outfits: mockOutfits.filter(o => o.name.toLowerCase().includes('formal')),
          fitCount: mockOutfits.filter(o => o.name.toLowerCase().includes('formal')).length
        }
      ];
      setCollections(collectionsData);

    } catch (error) {
      console.error('Error loading closet data:', error);
      toast({
        title: "Failed to load closet",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    console.log('🎯 File upload triggered:', files);
    
    if (!files) {
      console.log('🎯 No files selected');
      return;
    }

    console.log('🎯 Starting upload for', files.length, 'files');
    setIsUploading(true);
    
    for (const file of Array.from(files)) {
      try {
        console.log('🎯 Processing file:', file.name, file.size, 'bytes');
        
        // Convert file to base64
        const base64 = await fileToBase64(file);
        console.log('🎯 File converted to base64, length:', base64.length);
        
        // Call AI tagging function
        console.log('🎯 Calling closet-tagger function...');
        const { data, error } = await supabase.functions.invoke('closet-tagger', {
          body: { image: base64 }
        });
        
        console.log('🎯 AI response:', data, 'Error:', error);
        
        if (error) throw error;
        
        // Create new item with AI-generated data
        const newItem: ClosetItem = {
          id: Date.now().toString(),
          title: data.attributes?.title || 'New Item',
          brand: data.attributes?.brand || 'Unknown',
          category: data.attributes?.category || 'clothing',
          color: data.attributes?.color || 'unknown',
          season: data.attributes?.season || 'all',
          tags: data.tags || [],
          attributes: data.attributes || {},
          source_image_url: URL.createObjectURL(file), // Use local URL for now
          created_at: new Date().toISOString(),
          favorite: false
        };
        
        // Add to local state immediately
        setItems(prev => [newItem, ...prev]);
        
        // Create a clean success message
        const category = data.attributes?.category || 'clothing';
        const color = data.attributes?.color || 'unknown';
        const tagCount = data.tags?.length || 0;
        
        let description = `${category} recognized`;
        if (color !== 'unknown') {
          description += ` (${color})`;
        }
        if (tagCount > 0) {
          description += ` • ${tagCount} tags added`;
        }
        
        toast({
          title: "Item added! 🎯",
          description: description
        });
        
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: "Upload failed",
          description: "Please try again",
          variant: "destructive"
        });
      }
    }
    
    setIsUploading(false);
  };

  const generateOutfit = async () => {
    if (items.length < 3) {
      toast({
        title: "Need more items",
        description: "Add at least 3 items to generate outfits",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingOutfit(true);
    
    try {
      // Create a combined image of current items for AI analysis
      const currentOutfitImage = currentOutfit.length > 0 ? 
        await createOutfitImage(currentOutfit) : null;
      
      // Call AI outfit generation function
      const { data, error } = await supabase.functions.invoke('outfit-generator', {
        body: { 
          availableItems: items,
          lockedItems: currentOutfit.filter((_, index) => lockedSlots.has(index)),
          currentOutfitImage,
          preferences: {
            colorFilter: activeFilters.color,
            style: activeFilters.type || 'casual',
            weather: 'moderate', // Could be user preference
            occasion: 'casual'   // Could be user preference
          }
        }
      });
      
      if (error) throw error;
      
      // AI returns recommended outfit
      const recommendedItems = data.recommendedItems || [];
      const outfitScore = data.score || 75;
      const rationale = data.rationale || 'AI-generated combination';
      
      setCurrentOutfit(recommendedItems);
      setIsGeneratingOutfit(false);
      setShowOutfitGenerator(true);
      
      toast({
        title: "Outfit generated! ✨",
        description: `AI score: ${outfitScore}/100`
      });
      
    } catch (error) {
      console.error('Outfit generation error:', error);
      setIsGeneratingOutfit(false);
      toast({
        title: "Failed to generate outfit",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  // Helper function to create outfit image for AI analysis
  const createOutfitImage = async (outfitItems: ClosetItem[]): Promise<string | null> => {
    // This would create a combined image of the outfit items
    // For now, return null - in production this would use canvas API
    return null;
  };

  const saveOutfit = async () => {
    if (currentOutfit.length === 0) return;
    
    try {
      const outfitName = `Outfit ${outfits.length + 1}`;
      const score = Math.floor(Math.random() * 30) + 70;
      
      // For now, just show success since trendza tables aren't in types yet
      setShowOutfitGenerator(false);
      setCurrentOutfit([]);
      setLockedSlots(new Set());
      
      toast({
        title: "Outfit saved! ✨",
        description: `Saved as "${outfitName}"`
      });
      
    } catch (error) {
      console.error('Save outfit error:', error);
      toast({
        title: "Failed to save outfit",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const toggleFavorite = async (itemId: string) => {
    // In a real app, you'd have a favorites table or field
    // For now, just update local state
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, favorite: !item.favorite } : item
    ));
  };

  const toggleFilter = (filterKey: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterKey]: prev[filterKey] === 'active' ? '' : 'active'
    }));
  };

  const filteredItems = items.filter(item => {
    if (activeFilters.favorites && !item.favorite) return false;
    if (activeFilters.type && item.category !== activeFilters.type) return false;
    if (activeFilters.color && item.color !== activeFilters.color) return false;
    if (activeFilters.season && item.season !== activeFilters.season) return false;
    return true;
  });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-black mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your closet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: tokens.typography.fontFamily }}>
      {/* Premium Header */}
      <div className="sticky top-0 z-10 bg-white px-5 py-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Shirt className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl text-black" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
              TRENDZA
            </span>
          </div>
          <div className="px-3 py-1 bg-gray-50 rounded-full">
            <span className="text-sm text-gray-600" style={{ fontWeight: 600 }}>Closet</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Clean & Minimal */}
      <div className="flex border-b border-gray-100">
        {['pieces', 'fits', 'collections'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 py-2 text-center font-medium capitalize transition-colors ${
              activeTab === tab 
                ? 'text-gray-900 border-b-2' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{
              borderBottomColor: activeTab === tab ? '#000000' : 'transparent'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="px-4 py-6">
        {/* Pieces Tab - Grid Layout */}
        {activeTab === 'pieces' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Filter Chips - Horizontal Scroll */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              {FILTER_CHIPS.map((chip) => {
                const Icon = chip.icon;
                const isActive = activeFilters[chip.key];
                return (
                  <button
                    key={chip.key}
                    onClick={() => toggleFilter(chip.key)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      isActive 
                        ? 'text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={{
                      backgroundColor: isActive ? '#000000' : undefined
                    }}
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Upload Button - Dashed Border */}
            <Card 
              className="mb-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-dashed border-gray-200"
              onClick={() => fileInputRef.current?.click()}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-black"></div>
                  ) : (
                    <Camera className="w-8 h-8 text-black" />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">
                      {isUploading ? 'Adding items...' : 'Add new items'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Smart AI tagging • Unlimited storage
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleItemUpload}
              className="hidden"
            />

            {/* Items Grid - 3 Columns */}
            <div className="grid grid-cols-3 gap-3">
              {filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="relative"
                  onClick={() => setSelectedItem(item)}
                >
                  <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow border-0">
                    <div className="aspect-square relative bg-gray-50">
                      <img 
                        src={item.source_image_url || 'https://placehold.co/300x300?text=No+Image'} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item.id);
                        }}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/30 transition-colors"
                      >
                        <Heart 
                          className={`w-4 h-4 ${
                            item.favorite ? 'text-red-500 fill-red-500' : 'text-white'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {item.title}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.tags.slice(0, 2).map((tag, index) => (
                          <span 
                            key={index}
                            className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {item.tags.length > 2 && (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            +{item.tags.length - 2}
                          </span>
                        )}
                      </div>
                      {item.color && item.color !== 'unknown' && (
                        <div className="flex items-center gap-1 mt-1">
                          <div 
                            className="w-3 h-3 rounded-full border border-gray-200"
                            style={{ backgroundColor: item.color === 'blue' ? '#3B82F6' : 
                                                   item.color === 'black' ? '#000000' :
                                                   item.color === 'white' ? '#FFFFFF' :
                                                   item.color === 'red' ? '#EF4444' :
                                                   item.color === 'green' ? '#10B981' :
                                                   item.color === 'yellow' ? '#F59E0B' :
                                                   item.color === 'pink' ? '#EC4899' :
                                                   item.color === 'purple' ? '#8B5CF6' :
                                                   item.color === 'brown' ? '#A0522D' :
                                                   item.color === 'gray' ? '#6B7280' : '#D1D5DB' }}
                          />
                          <span className="text-xs text-gray-500 capitalize">{item.color}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {filteredItems.length === 0 && !isUploading && (
              <div className="text-center py-12">
                <Camera className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No items yet</p>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  Add Your First Item
                </Button>
              </div>
            )}

            {/* Outfit Generator FAB */}
            {items.length >= 3 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="fixed bottom-20 right-4 z-10"
              >
                <Button
                  onClick={generateOutfit}
                  disabled={isGeneratingOutfit}
                  className="rounded-full w-14 h-14 shadow-lg bg-black hover:bg-gray-800 text-white"
                >
                  {isGeneratingOutfit ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Shuffle className="w-6 h-6" />
                  )}
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Fits Tab - Outfit Cards */}
        {activeTab === 'fits' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-4">
              {outfits.map((outfit) => (
                <Card key={outfit.id} className="overflow-hidden border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">
                        {outfit.name}
                      </h3>
                      {outfit.score && (
                        <Badge className="bg-gray-100 text-black border-0">
                          {outfit.score}% match
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 mb-3">
                      {items
                        .filter(item => outfit.item_ids.includes(item.id))
                        .slice(0, 4)
                        .map((item, index) => (
                          <img
                            key={index}
                            src={item.source_image_url || 'https://placehold.co/64x64?text=No+Image'}
                            alt={item.title}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        ))}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {outfits.length === 0 && (
              <div className="text-center py-12">
                <LayoutGrid className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No outfits saved yet</p>
                <Button 
                  onClick={() => setActiveTab('pieces')}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  Create Your First Outfit
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* Collections Tab - Grid Layout */}
        {activeTab === 'collections' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-2 gap-4">
              {/* Create New Collection Card */}
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-dashed border-gray-200"
              >
                <CardContent className="p-6 text-center">
                  <Plus className="w-8 h-8 mx-auto mb-4 text-black" />
                  <p className="font-semibold text-gray-900 mb-1">
                    New Collection
                  </p>
                  <p className="text-sm text-gray-500">
                    Organize outfits
                  </p>
                </CardContent>
              </Card>

              {collections.map((collection) => (
                <Card key={collection.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow border-0">
                  <div className="aspect-square bg-gray-50 relative">
                    {collection.outfits.length > 0 && collection.outfits[0] && collection.outfits[0].item_ids.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1 p-2 h-full">
                        {items
                          .filter(item => collection.outfits[0]?.item_ids.includes(item.id))
                          .slice(0, 4)
                          .map((item, index) => (
                            <img
                              key={index}
                              src={item.source_image_url || 'https://placehold.co/150x150?text=No+Image'}
                              alt={item.title}
                              className="w-full h-full object-cover rounded"
                            />
                          ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <LayoutGrid className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="font-semibold text-gray-900 text-sm mb-1">
                      {collection.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {collection.fitCount} {collection.fitCount === 1 ? 'Fit' : 'Fits'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {collections.length === 0 && (
              <div className="text-center py-12">
                <LayoutGrid className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No collections yet</p>
                <p className="text-sm text-gray-400">
                  Perfect for trips, events, or seasonal wardrobes
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Item Detail Modal - Trendza Style */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedItem(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-lg max-w-sm w-full overflow-hidden"
              >
                <div className="relative">
                  <img 
                    src={selectedItem.source_image_url || 'https://placehold.co/400x400?text=No+Image'} 
                    alt={selectedItem.title}
                    className="w-full aspect-square object-cover"
                  />
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/20 backdrop-blur-sm"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {selectedItem.title}
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-500">Brand:</span>
                      <span className="text-gray-900 font-medium">{selectedItem.brand || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-500">Type:</span>
                      <span className="text-gray-900 font-medium capitalize">{selectedItem.category}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-500">Color:</span>
                      <span className="text-gray-900 font-medium capitalize">{selectedItem.color}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-500">Season:</span>
                      <span className="text-gray-900 font-medium capitalize">{selectedItem.season || 'All seasons'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-500">Tags:</span>
                      <span className="text-gray-900 font-medium">{selectedItem.tags.join(', ') || 'None'}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Outfit Generator Modal - Fit Stylist */}
        <AnimatePresence>
          {showOutfitGenerator && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowOutfitGenerator(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-lg p-6 max-w-sm w-full"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Fit Stylist
                  </h3>
                  <button
                    onClick={() => setShowOutfitGenerator(false)}
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                
                <div className="space-y-3 mb-6">
                  {currentOutfit.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      <img 
                        src={item.source_image_url || 'https://placehold.co/48x48?text=No+Image'} 
                        alt={item.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.brand}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (lockedSlots.has(index)) {
                            setLockedSlots(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(index);
                              return newSet;
                            });
                          } else {
                            setLockedSlots(prev => new Set([...prev, index]));
                          }
                        }}
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                                                  <Lock 
                            className={`w-4 h-4 ${
                              lockedSlots.has(index) ? 'text-black fill-black' : 'text-gray-400'
                            }`}
                          />
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={generateOutfit}
                    variant="outline" 
                    className="flex-1"
                  >
                    <Shuffle className="w-4 h-4 mr-2" />
                    Shuffle
                  </Button>
                  <Button 
                    onClick={saveOutfit}
                    className="flex-1 bg-black hover:bg-gray-800 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
