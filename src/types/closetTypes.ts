export interface ClosetItem {
  id: string;
  user_id: string;
  source_image_url: string | null;
  title: string | null;
  brand: string | null;
  category: string | null;
  color: string | null;
  season: string | null;
  tags: any;
  attributes: any;
  created_at: string;
  updated_at: string;
}

export type ClothingCategory = 
  | 'tops' 
  | 'bottoms' 
  | 'shoes' 
  | 'accessories';

export type Season = 'spring' | 'summer' | 'fall' | 'winter' | 'all-season';

export interface OutfitCombination {
  id: string;
  user_id: string;
  name?: string;
  item_ids: string[];
  items?: ClosetItem[];
  score?: number;
  rationale?: string;
  occasion?: string;
  created_at: string;
}

export interface ClosetStats {
  totalItems: number;
  itemsByCategory: Record<ClothingCategory, number>;
  recentlyAdded: number;
  favoriteColors: string[];
  topBrands: string[];
}

export interface CategoryFilter {
  category: ClothingCategory | 'all';
  label: string;
  emoji: string;
  count?: number;
}

export interface AddItemFormData {
  title?: string;
  brand?: string;
  category: ClothingCategory;
  color?: string;
  season?: Season;
  tags: string[];
  attributes: Record<string, any>;
}
