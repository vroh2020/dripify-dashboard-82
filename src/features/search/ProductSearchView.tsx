import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, TrendingUp, ExternalLink, Heart, 
  ShoppingBag, Star, Filter, SlidersHorizontal,
  Clock, Tag, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { tokens } from '@/design/tokens';

interface Product {
  id: string;
  title: string;
  brand: string;
  category: string;
  color: string;
  price: number;
  currency: string;
  image_url: string;
  product_url: string;
  deal_score?: number;
  partners: string[];
  original_price?: number;
}

interface SearchFilters {
  category?: string;
  brand?: string;
  color?: string;
  priceRange?: [number, number];
  occasion?: string;
}

const TRENDING_SEARCHES = [
  'Reformation Vintage',
  'Nike Fareway Sweater',
  'Serena Brown Tee',
  'Arista Baldwin Shirt'
];

const STORE_PARTNERS = [
  { name: 'amazon', logo: '📦' },
  { name: 'H&M', logo: '🏪' },
  { name: 'FARFETCH', logo: '🛍️' },
  { name: 'ASOS', logo: '👗' },
  { name: 'Nordstrom', logo: '💎' },
  { name: 'Zara', logo: '🔥' }
];

export const ProductSearchView = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const searchProducts = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('product-search', {
        body: { query, filters, limit: 20 }
      });
      
      if (error) throw error;
      
      // Mock deal scores and partners for demo
      const productsWithScores = data.items.map((product: any) => ({
        ...product,
        deal_score: Math.floor(Math.random() * 100),
        partners: ['The RealReal', 'Vestiaire', 'FARFETCH'].slice(0, Math.floor(Math.random() * 3) + 1),
        original_price: product.price * (1 + Math.random() * 0.5)
      }));
      
      setProducts(productsWithScores);
      
      // Add to recent searches
      setRecentSearches(prev => [query, ...prev.filter(s => s !== query)].slice(0, 5));
      
      toast({
        title: "Search complete! 🔍",
        description: `Found ${productsWithScores.length} products`
      });
      
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchProducts(searchQuery);
  };

  const toggleSaveItem = (productId: string) => {
    setSavedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
        toast({ title: "Removed from saved items" });
      } else {
        newSet.add(productId);
        toast({ title: "Saved to your collection! 💾" });
      }
      return newSet;
    });
  };

  const openProduct = (url: string, productTitle: string) => {
    window.open(url, '_blank');
    toast({
      title: "Opening product",
      description: `Redirecting to ${productTitle}...`
    });
  };

  const getDealBadgeColor = (score: number) => {
    if (score >= 80) return '#10B981'; // green
    if (score >= 60) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  };

  return (
    <div style={{ backgroundColor: tokens.color.background, minHeight: '100vh' }}>
      <div className="px-6 py-8 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 style={{ 
            fontSize: tokens.typography.sizes['3xl'], 
            fontWeight: 'bold', 
            color: tokens.color.foreground,
            marginBottom: tokens.spacing.sm 
          }}>
            Shopping
          </h1>
          <p style={{ 
            color: '#666', 
            marginBottom: tokens.spacing.xl,
            lineHeight: tokens.typography.lineHeights.normal 
          }}>
            Compare prices across thousands of sites
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <Search 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                size={20} 
              />
              <Input
                type="text"
                placeholder="Search Item or Brand"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-20"
                style={{ 
                  borderColor: tokens.color.border,
                  fontSize: tokens.typography.sizes.md 
                }}
              />
              <Button
                type="submit"
                disabled={isSearching}
                className="absolute right-1 top-1/2 transform -translate-y-1/2"
                style={{ backgroundColor: tokens.color.accent }}
                size="sm"
              >
                {isSearching ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  'Search'
                )}
              </Button>
            </div>
          </form>

          {/* Trending Searches (shown when no search results) */}
          {products.length === 0 && !isSearching && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card style={{ marginBottom: tokens.spacing.lg, boxShadow: tokens.shadow.sm }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp style={{ width: 16, height: 16, color: tokens.color.accent }} />
                    <h3 style={{ 
                      fontSize: tokens.typography.sizes.md, 
                      fontWeight: '600', 
                      color: tokens.color.foreground 
                    }}>
                      Trending searches
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {TRENDING_SEARCHES.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSearchQuery(search);
                          searchProducts(search);
                        }}
                        className="block w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span style={{ color: tokens.color.foreground }}>{search}</span>
                          <span style={{ fontSize: tokens.typography.sizes.sm, color: '#666' }}>
                            {Math.floor(Math.random() * 100)}% lower prices
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Picks */}
              <Card style={{ marginBottom: tokens.spacing.lg, boxShadow: tokens.shadow.sm }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 style={{ 
                      fontSize: tokens.typography.sizes.md, 
                      fontWeight: '600', 
                      color: tokens.color.foreground 
                    }}>
                      Top picks for you
                    </h3>
                    <Button variant="ghost" size="sm" style={{ color: tokens.color.accent }}>
                      View All
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2].map((item) => (
                      <div key={item} className="relative">
                        <div className="aspect-square bg-gray-100 rounded-lg mb-2"></div>
                        <p style={{ 
                          fontSize: tokens.typography.sizes.sm, 
                          fontWeight: '500',
                          color: tokens.color.foreground 
                        }}>
                          {item === 1 ? 'Pants' : 'Dress'}
                        </p>
                        <p style={{ fontSize: tokens.typography.sizes.xs, color: '#666' }}>
                          {item === 1 ? 'COS' : 'AMY LYNN'}
                        </p>
                        <Heart className="absolute top-2 right-2 w-4 h-4 text-white" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Shop by Store */}
              <Card style={{ boxShadow: tokens.shadow.sm }}>
                <CardContent className="p-4">
                  <h3 style={{ 
                    fontSize: tokens.typography.sizes.md, 
                    fontWeight: '600', 
                    color: tokens.color.foreground,
                    marginBottom: tokens.spacing.md 
                  }}>
                    Shop by Store
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {STORE_PARTNERS.map((store) => (
                      <button
                        key={store.name}
                        className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div style={{ fontSize: '24px', marginBottom: 4 }}>{store.logo}</div>
                        <span style={{ 
                          fontSize: tokens.typography.sizes.xs, 
                          color: tokens.color.foreground,
                          fontWeight: '500' 
                        }}>
                          {store.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Search Results */}
          {products.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Results Header */}
              <div className="flex items-center justify-between mb-4">
                <p style={{ color: '#666' }}>
                  {products.length} results for "{searchQuery}"
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  style={{ borderColor: tokens.color.border }}
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-1 gap-4">
                {products.map((product) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card 
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      style={{ boxShadow: tokens.shadow.md }}
                      onClick={() => openProduct(product.product_url, product.title)}
                    >
                      <CardContent className="p-0">
                        <div className="flex">
                          {/* Product Image */}
                          <div className="w-24 h-24 bg-gray-100 relative flex-shrink-0">
                            <img 
                              src={product.image_url} 
                              alt={product.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSaveItem(product.id);
                              }}
                              className="absolute top-1 right-1 p-1 rounded-full bg-black/20 backdrop-blur-sm"
                            >
                              <Heart 
                                className="w-3 h-3" 
                                style={{ 
                                  color: savedItems.has(product.id) ? '#ef4444' : 'white',
                                  fill: savedItems.has(product.id) ? '#ef4444' : 'none'
                                }} 
                              />
                            </button>
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 p-3">
                            <div className="flex items-start justify-between mb-1">
                              <h3 style={{ 
                                fontSize: tokens.typography.sizes.sm, 
                                fontWeight: '600',
                                color: tokens.color.foreground,
                                lineHeight: tokens.typography.lineHeights.tight 
                              }}>
                                {product.title}
                              </h3>
                              {product.deal_score && (
                                <Badge 
                                  style={{ 
                                    backgroundColor: getDealBadgeColor(product.deal_score),
                                    fontSize: '10px',
                                    padding: '2px 6px'
                                  }}
                                >
                                  {product.deal_score}% deal
                                </Badge>
                              )}
                            </div>
                            
                            <p style={{ 
                              fontSize: tokens.typography.sizes.xs, 
                              color: '#666',
                              marginBottom: 6 
                            }}>
                              {product.brand}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span style={{ 
                                  fontSize: tokens.typography.sizes.md, 
                                  fontWeight: '700',
                                  color: tokens.color.foreground 
                                }}>
                                  ${product.price}
                                </span>
                                {product.original_price && product.original_price > product.price && (
                                  <span style={{ 
                                    fontSize: tokens.typography.sizes.xs, 
                                    color: '#666',
                                    textDecoration: 'line-through' 
                                  }}>
                                    ${Math.round(product.original_price)}
                                  </span>
                                )}
                              </div>
                              <ExternalLink className="w-4 h-4 text-gray-400" />
                            </div>
                            
                            {/* Partner badges */}
                            {product.partners.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {product.partners.slice(0, 2).map((partner, index) => (
                                  <Badge 
                                    key={index}
                                    variant="outline" 
                                    style={{ 
                                      fontSize: '9px',
                                      padding: '1px 4px',
                                      borderColor: tokens.color.border
                                    }}
                                  >
                                    {partner}
                                  </Badge>
                                ))}
                                {product.partners.length > 2 && (
                                  <Badge 
                                    variant="outline"
                                    style={{ 
                                      fontSize: '9px',
                                      padding: '1px 4px',
                                      borderColor: tokens.color.border
                                    }}
                                  >
                                    +{product.partners.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
