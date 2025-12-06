import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Calendar, Tag, Palette } from 'lucide-react';

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

interface ItemDetailModalProps {
  item: ClosetItem | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: (itemId: string) => void;
}

export default function ItemDetailModal({
  item,
  isOpen,
  onClose,
  onToggleFavorite
}: ItemDetailModalProps) {
  if (!item) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Item Details</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Image */}
              <div className="aspect-square rounded-xl overflow-hidden bg-white border border-gray-200">
                {item.source_image_url ? (
                  <img
                    src={item.source_image_url}
                    alt={item.title}
                    className="w-full h-full object-contain p-2"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-400">No image</span>
                  </div>
                )}
              </div>

              {/* Title and Favorite */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {item.title}
                  </h3>
                  {item.brand && (
                    <p className="text-gray-600">{item.brand}</p>
                  )}
                </div>
                <motion.button
                  onClick={() => onToggleFavorite(item.id)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={`p-2 rounded-full transition-colors ${
                    item.favorite
                      ? 'bg-red-50 text-red-500'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${item.favorite ? 'fill-current' : ''}`} />
                </motion.button>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Tag className="w-4 h-4" />
                    <span>Category</span>
                  </div>
                  <p className="font-medium text-gray-900 capitalize">
                    {item.category}
                  </p>
                </div>

                {/* Color */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Palette className="w-4 h-4" />
                    <span>Color</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{
                        backgroundColor: getColorValue(item.color)
                      }}
                    />
                    <p className="font-medium text-gray-900 capitalize">
                      {item.color}
                    </p>
                  </div>
                </div>

                {/* Season */}
                {item.season && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Season</span>
                    </div>
                    <p className="font-medium text-gray-900 capitalize">
                      {item.season}
                    </p>
                  </div>
                )}

                {/* Created Date */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Added</span>
                  </div>
                  <p className="font-medium text-gray-900">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Attributes */}
              {item.attributes && Object.keys(item.attributes).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Details</p>
                  <div className="space-y-1">
                    {Object.entries(item.attributes).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-600 capitalize">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <span className="text-gray-900 font-medium">
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper function to get color values
function getColorValue(colorName: string): string {
  const colorMap: Record<string, string> = {
    black: '#000000',
    white: '#FFFFFF',
    red: '#EF4444',
    blue: '#3B82F6',
    green: '#10B981',
    yellow: '#F59E0B',
    pink: '#EC4899',
    purple: '#8B5CF6',
    brown: '#A0522D',
    gray: '#6B7280',
    orange: '#F97316'
  };
  
  return colorMap[colorName.toLowerCase()] || '#6B7280';
}
