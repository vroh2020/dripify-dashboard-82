import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Filter, Star, ExternalLink, 
  Heart, ShoppingBag, TrendingUp, Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { tokens } from '@/design/tokens';

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  url: string;
  imageUrl: string;
  dealScore: number;
  rating: number;
  category: string;
  isFavorite?: boolean;
}

const TRENDING_SEARCHES = [
  'Blazers', 'Sneakers', 'Dresses', 'Jeans', 'Jackets'
];

const PARTNER_STORES = [
  { name: 'ZARA', logo: '/brands/zara.svg' },
  { name: 'H&M', logo: '/brands/hm.svg' },
  { name: 'UNIQLO', logo: '/brands/uniqlo.svg' },
  { name: 'NORDSTROM', logo: '/brands/nordstrom.svg' },
];

const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Classic White Button Shirt',
    brand: 'ZARA',
    price: 29.99,
    originalPrice: 49.99,
    url: 'https://zara.com',
    imageUrl: 'https://placehold.co/300x400?text=White+Shirt',
    dealScore: 85,
    rating: 4.5,
    category: 'shirts'
  },
  {
    id: '2',
    name: 'High-Waisted Jeans',
    brand: 'H&M',
    price: 39.99,
    url: 'https://hm.com',
    imageUrl: 'https://placehold.co/300x400?text=Blue+Jeans',
    dealScore: 72,
    rating: 4.2,
    category: 'jeans'
  }
];

export const ShoppingView = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleTrendingSearch = (searchTerm: string) => {
    setSearchQuery(searchTerm);
    handleSearch();
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    
    // Mock search functionality
    setTimeout(() => {
      setProducts(MOCK_PRODUCTS.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase())
      ));
      setIsLoading(false);
    }, 1000);
  };

  const toggleFavorite = (productId: string) => {
    setProducts(prev => prev.map(product => 
      product.id === productId 
        ? { ...product, isFavorite: !product.isFavorite }
        : product
    ));
  };

  const getDealScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: tokens.typography.fontFamily }}>
      {/* Premium Header */}
      <div className="sticky top-0 z-10 bg-white px-5 py-4" style={{ boxShadow: tokens.shadow.sm }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl text-black" style={{ fontFamily: tokens.typography.fontFamily, fontWeight: tokens.typography.weights.bold }}>
              TRENDZA
            </span>
          </div>
          <button className="p-2 rounded-full hover:bg-gray-50 transition-colors">
            <Filter className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="px-5 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Premium Hero Section */}
          <div className="mb-8">
            <h1 className="text-2xl text-black mb-3" style={{ fontWeight: tokens.typography.weights.bold }}>
              Discover
            </h1>
            <p className="text-gray-600 text-base" style={{ fontWeight: tokens.typography.weights.medium }}>
              Curated pieces for your perfect style
            </p>
          </div>

          {/* Premium Search Bar */}
          <div className="relative mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search for pieces, brands, or styles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-12 pr-4 py-4 text-base border-0 rounded-2xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gray-200 transition-all duration-200"
                style={{ boxShadow: tokens.shadow.sm }}
              />
            </div>
          </div>

          {/* Premium Category Cards */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-black" />
              <span className="text-sm text-black" style={{ fontWeight: tokens.typography.weights.semibold }}>
                Trending Categories
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {TRENDING_SEARCHES.slice(0, 4).map((search) => (
                <div
                  key={search}
                  onClick={() => handleTrendingSearch(search)}
                  className="relative h-24 bg-gray-100 rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200"
                  style={{ boxShadow: tokens.shadow.sm }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900/20 to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <span className="text-white text-sm font-semibold">
                      {search}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Partner Stores */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-4 h-4 text-black" />
              <span className="text-sm text-gray-900" style={{ fontWeight: tokens.typography.weights.semibold }}>
                Partner Stores
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {PARTNER_STORES.map((store) => (
                <Card key={store.name} className="cursor-pointer hover:shadow-md transition-all duration-200 border-0 bg-white" style={{ boxShadow: tokens.shadow.card }}>
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 text-xs font-semibold">
                          {store.name.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-900" style={{ fontWeight: tokens.typography.weights.medium }}>
                      {store.name}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Products Grid - Premium 2-Column Layout */}
          <div className="grid grid-cols-2 gap-4">
            {isLoading ? (
              <div className="col-span-2 text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-black mx-auto mb-4"></div>
                <p className="text-gray-500">Finding the best deals...</p>
              </div>
            ) : (
              products.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="overflow-hidden border-0 bg-white cursor-pointer hover:shadow-lg transition-all duration-200" style={{ boxShadow: tokens.shadow.card }}>
                    <CardContent className="p-0">
                      {/* Product Image */}
                      <div className="relative aspect-square">
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(product.id);
                          }}
                          className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors"
                          style={{ boxShadow: tokens.shadow.sm }}
                        >
                          <Heart 
                            className={`w-4 h-4 ${
                              product.isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-400'
                            }`}
                          />
                        </button>
                        {product.originalPrice && (
                          <div className="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
                            SALE
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-4">
                        <div className="mb-2">
                          <h3 className="text-gray-900 text-sm mb-1 truncate" style={{ fontWeight: tokens.typography.weights.semibold }}>
                            {product.name}
                          </h3>
                          <p className="text-xs text-gray-500">{product.brand}</p>
                        </div>

                        {/* Price */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-black text-base" style={{ fontWeight: tokens.typography.weights.bold }}>
                              ${product.price}
                            </span>
                            {product.originalPrice && (
                              <span className="text-sm text-gray-400 line-through">
                                ${product.originalPrice}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => window.open(product.url, '_blank')}
                            className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                            style={{ boxShadow: tokens.shadow.button }}
                          >
                            Shop
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>

          {products.length === 0 && !isLoading && (
            <div className="col-span-2 text-center py-12">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No products found</p>
              <p className="text-sm text-gray-400">
                Try searching for different terms or adjust your filters
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
