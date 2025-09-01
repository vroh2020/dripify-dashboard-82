import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Sparkles } from 'lucide-react';

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

interface CollectionsTabProps {
  outfits: Outfit[];
  onEditOutfit: (outfit: Outfit) => void;
  onDeleteOutfit: (outfitId: string) => void;
  onOpenFitStylist: () => void;
}

export default function CollectionsTab({
  outfits,
  onEditOutfit,
  onDeleteOutfit,
  onOpenFitStylist
}: CollectionsTabProps) {
  const hasOutfits = outfits.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Collections</h2>
        <p className="text-gray-600">
          {outfits.length} {outfits.length === 1 ? 'outfit' : 'outfits'} saved
        </p>
      </div>

      {/* Simple Empty State */}
      {!hasOutfits && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No saved outfits yet</p>
          <p className="text-gray-400 text-sm mt-2">Create outfits in the Fits tab to see them here</p>
        </div>
      )}

      {/* Outfits Grid */}
      {hasOutfits && (
        <div className="space-y-6">
          {/* Go-To Looks Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Go-To Looks</h3>
              <span className="text-sm text-gray-500">{Math.min(outfits.length, 6)} Fits</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {outfits.slice(0, 6).map((outfit) => (
                <div
                  key={outfit.id}
                  className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group relative"
                  onClick={() => onEditOutfit(outfit)}
                >
                  {/* Outfit Preview - Vertical stacked thumbnails */}
                  <div className="relative aspect-square bg-white p-4">
                    {outfit.items.length > 0 ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                        {outfit.items.slice(0, 4).map((item, i) => (
                          <div key={item.id} className={`w-14 ${i === 3 ? 'h-10' : 'h-14'} rounded-xl overflow-hidden border border-gray-100 shadow-sm`}>
                            <img
                              src={item.source_image_url}
                              alt={item.title}
                              className="w-full h-full object-contain p-1"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          </div>
                        ))}
                        {outfit.items.length > 4 && (
                          <div className="text-xs text-gray-500">+{outfit.items.length - 4} more</div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Outfit Info */}
                  <div className="p-4">
                    <h4 className="font-bold text-gray-900 text-sm truncate">{outfit.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {outfit.items.length} piece{outfit.items.length !== 1 ? 's' : ''}
                      {outfit.score && (
                        <span className="ml-1 text-green-600">• {outfit.score}%</span>
                      )}
                    </p>
                  </div>

                  {/* Action button */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteOutfit(outfit.id);
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-gray-600 hover:text-red-600" />
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* More Outfits - Clean Single Section */}
          {outfits.length > 6 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">More Outfits</h3>
                <span className="text-sm text-gray-500">{outfits.length - 6} Fits</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {outfits.slice(6).map((outfit) => (
                  <div
                    key={outfit.id}
                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group relative"
                    onClick={() => onEditOutfit(outfit)}
                  >
                    {/* Clean Outfit Preview */}
                    <div className="relative aspect-square bg-gray-50 p-4">
                      {outfit.items.length > 0 ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          {/* Main item display */}
                          {outfit.items[0] && (
                            <div className="absolute inset-2 rounded-xl overflow-hidden bg-white shadow-sm">
                              <img
                                src={outfit.items[0].source_image_url}
                                alt={outfit.items[0].title}
                                className="w-full h-full object-contain p-2"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          
                          {/* Item count badge */}
                          {outfit.items.length > 1 && (
                            <div className="absolute bottom-2 right-2 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {outfit.items.length}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Clean Outfit Info */}
                    <div className="p-4">
                      <h4 className="font-bold text-gray-900 text-sm truncate">{outfit.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {outfit.items.length} piece{outfit.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Single Action Button */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteOutfit(outfit.id);
                        }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-gray-600 hover:text-red-600" />
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}