import { useState, useEffect, memo, useRef } from 'react';
import { Plus, Heart } from 'lucide-react';

// Global image cache for instant loading across the app
const globalImageCache = new Map<string, HTMLImageElement>();

// Preload images instantly
const preloadImage = (url: string) => {
  if (!url || globalImageCache.has(url)) return;
  
  const img = new Image();
  img.src = url;
  globalImageCache.set(url, img);
};

// Ultra-fast item card with instant image loading
const SimpleItemCard = memo(({ 
  item, 
  onClick, 
  onToggleFavorite 
}: { 
  item: ClosetItem; 
  onClick: () => void; 
  onToggleFavorite: () => void; 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Instant image loading with cache
  useEffect(() => {
    if (!item.source_image_url) return;
    
    // Check if already cached
    const cachedImg = globalImageCache.get(item.source_image_url);
    if (cachedImg && cachedImg.complete) {
      setImageLoaded(true);
      return;
    }

    // Preload instantly
    preloadImage(item.source_image_url);
    
    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      globalImageCache.set(item.source_image_url!, img);
    };
    img.onerror = () => setImageError(true);
    img.src = item.source_image_url;
  }, [item.source_image_url]);

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
    >
      {/* Image only, small tile */}
      <div className="aspect-square relative">
        {item.source_image_url && !imageError ? (
          <img
            ref={imgRef}
            src={item.source_image_url}
            alt={item.title}
            className={`w-full h-full object-contain p-2 bg-white transition-opacity duration-100 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onError={() => setImageError(true)}
            loading="eager"
          />
        ) : (
          <div className="w-full h-full bg-gray-50 flex items-center justify-center">
            <span className="text-gray-400 text-xs">•••</span>
          </div>
        )}
        
        {/* Loading state */}
        {!imageLoaded && !imageError && item.source_image_url && (
          <div className="absolute inset-0 bg-gray-100 animate-pulse rounded-2xl" />
        )}
        
        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="absolute top-2 right-2 w-8 h-8 bg-white/95 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
        >
          <Heart className={`w-4 h-4 ${item.favorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
        </button>
        
      </div>
      {/* No text under tiles for ultra-clean grid */}
    </div>
  );
});

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

interface FilterChip {
  key: string;
  label: string;
  icon?: React.ComponentType<any>;
}

interface PiecesTabProps {
  items: ClosetItem[];
  filteredItems: ClosetItem[];
  isUploading: boolean;
  freeLimit: number;
  filterChips: FilterChip[];
  activeFilters: Record<string, string>;
  onToggleFilter: (filterKey: string) => void;
  onClearFilters: () => void;
  onAddPiece: () => void;
  onItemClick: (item: ClosetItem) => void;
  onToggleFavorite: (itemId: string) => void;
}

export default function PiecesTab({
  items,
  filteredItems,
  isUploading,
  freeLimit,
  filterChips,
  activeFilters,
  onToggleFilter,
  onClearFilters,
  onAddPiece,
  onItemClick,
  onToggleFavorite
}: PiecesTabProps) {
  const hasActiveFilters = Object.keys(activeFilters).length > 0;
  const isOverLimit = items.length >= freeLimit;

  // Preload all images instantly when items change
  useEffect(() => {
    items.forEach(item => {
      if (item.source_image_url) {
        preloadImage(item.source_image_url);
      }
    });
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Closet</h2>
        <p className="text-gray-600">
          {items.length} {items.length === 1 ? 'item' : 'items'}
          {isOverLimit && (
            <span className="text-orange-600 ml-2">
              • {items.length - freeLimit} over free limit
            </span>
          )}
        </p>
      </div>

      {/* Filter Chips */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filterChips.map((chip) => {
            const Icon = chip.icon;
            const isActive = activeFilters[chip.key];
            
            return (
              <button
                key={chip.key}
                onClick={() => onToggleFilter(chip.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-gray-200 text-black'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Items Grid */}
      <div className="space-y-4">
        {isUploading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-black mx-auto mb-3"></div>
            <p className="text-gray-600">Uploading items...</p>
          </div>
        )}

        {!isUploading && filteredItems.length === 0 && !hasActiveFilters && (
          <div className="flex items-center justify-center py-24">
            <button
              onClick={onAddPiece}
              className="w-20 h-20 bg-gray-100 hover:bg-gray-200 rounded-2xl border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center transition-all"
            >
              <Plus className="w-8 h-8 text-gray-600" />
            </button>
          </div>
        )}

        {!isUploading && filteredItems.length === 0 && hasActiveFilters && (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No items match your filters</h3>
            <p className="text-gray-600">Try adjusting your filters</p>
          </div>
        )}

        {!isUploading && filteredItems.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {/* Add Piece Card - first tile */}
            <button
              onClick={onAddPiece}
              className="border-2 border-dashed border-gray-300 rounded-2xl p-3 flex flex-col items-center justify-center text-center bg-white hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center mb-2">
                <Plus className="w-6 h-6 text-gray-700" />
              </div>
              <p className="text-gray-900 font-semibold text-sm">Add Piece</p>
            </button>

            {/* Ultra-fast render - instant loading */}
            {filteredItems.map((item) => (
              <SimpleItemCard
                key={item.id}
                item={item}
                onClick={() => onItemClick(item)}
                onToggleFavorite={() => onToggleFavorite(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
