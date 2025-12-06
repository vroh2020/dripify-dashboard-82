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
    <div className="flex-1 bg-white min-h-screen p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Collections</h2>
        <p className="text-gray-600">
          {outfits.length} {outfits.length === 1 ? 'outfit' : 'outfits'} saved
        </p>
      </div>

      {/* Simple Empty State */}
      {!hasOutfits && (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl font-semibold text-gray-900 mb-2">No saved outfits yet</p>
            <p className="text-gray-600 mb-6">Create outfits in the Fits tab to see them here</p>
            <button
              onClick={onOpenFitStylist}
              className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-900 transition-colors"
            >
              Go to Fits Tab
            </button>
          </div>
        </div>
      )}

      {/* Collections Grid - Matching Reference Design */}
      {hasOutfits && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {outfits.map((outfit) => (
            <motion.div
              key={outfit.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group relative"
              onClick={() => onEditOutfit(outfit)}
            >
              {/* Collection Header - Name and Count */}
              <div className="px-4 py-3">
                <h4 className="font-semibold text-gray-900 text-sm mb-1">{outfit.name}</h4>
                <p className="text-xs text-gray-500">
                  1 Fit
                </p>
              </div>

              {/* Vertical Stack of 4 Items Preview */}
              <div className="px-4 pb-4">
                {outfit.items.length > 0 ? (
                  <div className="flex flex-col items-center gap-2">
                    {outfit.items.slice(0, 4).map((item, index) => (
                      <div
                        key={item.id}
                        className="w-14 h-14 bg-white border border-gray-100 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
                      >
                        {item.source_image_url ? (
                          <img
                            src={item.source_image_url}
                            alt={item.title}
                            className="w-full h-full object-contain p-1"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-6">
                    <Sparkles className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Delete button */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteOutfit(outfit.id);
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  <Trash2 className="w-3.5 h-3.5 text-gray-900" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}