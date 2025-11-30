import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ArrowLeft, Globe, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { removeBackgroundFromBlob, isBackgroundRemovalAvailable } from '@/utils/backgroundRemoval';
import { useToast } from '@/hooks/use-toast';

// Import extracted components
import PiecesTab from './PiecesTab';
import FitsTab from './FitsTab';
import CollectionsTab from './CollectionsTab';
import ItemDetailModal from './ItemDetailModal';
import WebSearchModal from './WebSearchModal';

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
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [editingOutfit, setEditingOutfit] = useState<Outfit | null>(null);
  const [currentOutfit, setCurrentOutfit] = useState<ClosetItem[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ClosetItem | null>(null);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [showWebSearch, setShowWebSearch] = useState(false);
  const { toast } = useToast();
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

  const processAndSaveImage = async (blob: Blob, sourceUrl: string | null = null) => {
    try {
      setIsUploading(true);
      console.log('🎨 Processing image...');
      console.log('📦 Original blob size:', blob.size, 'bytes');
      
      // Check if background removal is available
      const bgRemovalAvailable = isBackgroundRemovalAvailable();
      if (!bgRemovalAvailable) {
        console.warn('⚠️ Background removal not available - using original image');
        toast({
          title: "Background Removal Unavailable",
          description: "Background removal requires iOS 17.0+ and the plugin to be registered. Using original image.",
          variant: "destructive",
        });
      }
      
      // Remove background using native iOS Vision framework (FREE & FAST on iOS 17+!)
      const startTime = Date.now();
      let processedBlob = blob;
      
      try {
        processedBlob = await removeBackgroundFromBlob(blob);
        const duration = Date.now() - startTime;
        console.log(`⏱️ Background removal took ${duration}ms`);
        console.log('📦 Original blob size:', blob.size, 'bytes');
        console.log('📦 Processed blob size:', processedBlob.size, 'bytes');
        
        // Check if background removal actually worked
        const sizeDifference = Math.abs(processedBlob.size - blob.size);
        const sizeChangePercent = (sizeDifference / blob.size) * 100;
        
        if (sizeChangePercent < 5) {
          // Size is too similar - probably didn't work
          console.warn('⚠️ Processed blob size is too similar to original - background removal likely failed');
          console.warn('Size difference:', sizeChangePercent.toFixed(2) + '%');
          toast({
            title: "Background Removal Failed",
            description: "Vision couldn't detect the clothing item. Try: 1) Better contrast (dark item on light bg), 2) Item hanging or on mannequin (3D shape), 3) Clear, well-lit photo. Using original image.",
            variant: "destructive",
          });
        } else {
          console.log('✅ Background removal successful - image was processed');
          console.log('Size change:', sizeChangePercent.toFixed(2) + '%');
          toast({
            title: "Background Removed",
            description: `Successfully removed background in ${duration}ms`,
            variant: "success",
          });
        }
      } catch (error: any) {
        const duration = Date.now() - startTime;
        console.log(`⏱️ Background removal failed after ${duration}ms`);
        console.error('❌ Background removal failed with error:', error);
        console.error('Error message:', error?.message);
        
        // Show user-friendly error message
        let errorMessage = "Background removal failed. ";
        if (error?.message?.includes("No objects detected")) {
          errorMessage += "Vision couldn't detect the clothing item. Try a photo with better contrast (dark item on light background) or take a photo of the item hanging (3D shape works better than flat lays).";
        } else if (error?.message?.includes("iOS 17")) {
          errorMessage += "Your device needs iOS 17.0 or later for background removal.";
        } else if (error?.message) {
          errorMessage += error.message;
        } else {
          errorMessage += "Unknown error occurred.";
        }
        
        toast({
          title: "Background Removal Failed",
          description: errorMessage + " Using original image.",
          variant: "destructive",
        });
        
        // Use original blob
        processedBlob = blob;
      }

      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        console.warn('Cannot save item: user not authenticated');
        setIsUploading(false);
        return;
      }

      // Upload image to storage
      const timestamp = Date.now();
      const storagePath = `closet/${auth.user.id}/${timestamp}_no_bg.png`;
      
      console.log('☁️ Uploading image to storage...');
      
      const { error: uploadErr } = await supabase.storage
        .from('style_images')
        .upload(storagePath, processedBlob, { cacheControl: '3600', upsert: false });
      
      let publicUrl = sourceUrl || '';
      if (!uploadErr) {
        const { data: publicUrlData } = supabase.storage
          .from('style_images')
          .getPublicUrl(storagePath);
        publicUrl = publicUrlData?.publicUrl || sourceUrl || '';
        console.log('✅ Image uploaded to storage:', storagePath);
      } else {
        console.warn('Storage upload failed, using source URL if available:', uploadErr);
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
        
        // Compress image before converting to base64 (max 1024px on longest side, 0.8 quality)
        const compressedBlob = await new Promise<Blob>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDimension = 1024;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
              if (width > maxDimension) {
                height = (height * maxDimension) / width;
                width = maxDimension;
              }
            } else {
              if (height > maxDimension) {
                width = (width * maxDimension) / height;
                height = maxDimension;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Could not get canvas context'));
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to compress image'));
              }
            }, 'image/jpeg', 0.8);
          };
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = URL.createObjectURL(processedBlob);
        });
        
        // Convert compressed blob to base64 for AI analysis
        const base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(compressedBlob);
        });
        
        // Log base64 image size for debugging
        console.log('📊 Base64 image size:', (base64Image.length / 1024).toFixed(2), 'KB');
        
        let analysis;
        let aiError;
        
        try {
          const result = await supabase.functions.invoke('analyze-closet-item', {
            body: { image: base64Image }
          });
          analysis = result.data;
          aiError = result.error;
          
          // If we got an error, try to fetch directly to get the actual error response
          if (aiError) {
            console.log('🔄 Attempting direct fetch to get error details...');
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const response = await fetch('https://jjqwhxamjxsiotnhhqco.supabase.co/functions/v1/analyze-closet-item', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session?.access_token || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcXdoeGFtanhzaW90bmhocWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxMDQxNTQsImV4cCI6MjA1MzY4MDE1NH0.4KMTPF3R6-XQCeRVPSuuWibRawzjEtk60RFCQZr2dz0'}`,
                  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcXdoeGFtanhzaW90bmhocWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxMDQxNTQsImV4cCI6MjA1MzY4MDE1NH0.4KMTPF3R6-XQCeRVPSuuWibRawzjEtk60RFCQZr2dz0'
                },
                body: JSON.stringify({ image: base64Image })
              });
              
              if (!response.ok) {
                const errorText = await response.text();
                console.error('📋 Direct fetch error response:', response.status, errorText);
                try {
                  const errorJson = JSON.parse(errorText);
                  console.error('📋 Parsed error:', errorJson);
                  if (errorJson.error) {
                    throw new Error(errorJson.error);
                  }
                } catch (e) {
                  throw new Error(`Edge function error (${response.status}): ${errorText.substring(0, 200)}`);
                }
              }
            } catch (fetchErr: any) {
              console.error('❌ Direct fetch also failed:', fetchErr);
            }
          }
        } catch (err: any) {
          console.error('❌ Exception during invoke:', err);
          aiError = err;
        }
        
        if (aiError) {
          console.error('❌ AI analysis error:', aiError);
          console.error('Error details:', JSON.stringify(aiError, null, 2));
          
          // Try to extract the actual error message from the response
          let errorMessage = 'AI analysis failed';
          if (aiError.message) {
            errorMessage = aiError.message;
          }
          
          // Try to get response body if available
          if ((aiError as any).context) {
            console.error('Error context:', (aiError as any).context);
          }
          
          console.error('❌ Final error message:', errorMessage);
          throw new Error(errorMessage);
        }
        
        if (!analysis) {
          console.error('❌ No analysis data returned');
          throw new Error('No analysis data returned from AI service');
        }
        
        if (analysis && analysis.category) {
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
        } else {
          console.warn('⚠️ AI analysis returned invalid data:', analysis);
        }
      } catch (aiError: any) {
        console.error('❌ AI analysis failed:', aiError?.message || aiError);
        console.log('📊 Using default values:', itemData);
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
        
        const newItem: ClosetItem = {
          id: inserted.id,
          title: inserted.title || 'New Item',
          brand: inserted.brand || '',
          category: inserted.category || 'tops',
          color: inserted.color || 'unknown',
          season: inserted.season || 'all',
          tags: Array.isArray(inserted.tags) ? (inserted.tags as any[]).filter(t => typeof t === 'string') as string[] : [],
          attributes: (inserted.attributes && typeof inserted.attributes === 'object' && !Array.isArray(inserted.attributes)) ? (inserted.attributes as Record<string, any>) : {},
          source_image_url: inserted.source_image_url || '',
          created_at: inserted.created_at,
          favorite: false
        };
        
        setItems(prev => [newItem, ...prev]);
        console.log('✅ Item added to local state');
        
      } else {
        console.error('Failed to save item to database:', insertErr);
        throw new Error('Database save failed');
      }
    } catch (error) {
      console.error('❌ Processing error:', error);
    } finally {
      setIsUploading(false);
      console.log('📷 Process completed');
    }
  };

  // Camera disabled temporarily
  // const handleCameraCapture = async () => {
  //   setShowUploadOptions(false);
  //   try {
  //     console.log('📷 Starting camera capture...');
  //     const image = await Camera.getPhoto({
  //       quality: 90,
  //       allowEditing: false,
  //       resultType: CameraResultType.DataUrl,
  //       source: CameraSource.Camera
  //     });

  //     if (!image.dataUrl) return;

  //     const response = await fetch(image.dataUrl);
  //     const blob = await response.blob();
  //     await processAndSaveImage(blob);

  //   } catch (error) {
  //     console.error('❌ Camera capture error:', error);
  //   }
  // };

  const handleGalleryUpload = async () => {
    setShowUploadOptions(false);
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      if (!image.dataUrl) return;

      const response = await fetch(image.dataUrl);
      const blob = await response.blob();
      await processAndSaveImage(blob);

    } catch (error) {
      console.error('❌ Gallery upload error:', error);
    }
  };

  const handleWebImageSelect = async (imageUrl: string) => {
    setShowWebSearch(false);
    try {
      setIsUploading(true);
      // Proxy the image fetch if needed or fetch directly
      // For the demo URLs, direct fetch works
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await processAndSaveImage(blob, imageUrl);
    } catch (error) {
      console.error('❌ Web image fetch error:', error);
      setIsUploading(false);
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
          name: inserted.name || 'Fit',
          item_ids: Array.isArray(inserted.item_ids) ? inserted.item_ids : [],
          ...(inserted.score !== null && inserted.score !== undefined && { score: inserted.score }),
          ...(inserted.rationale !== null && inserted.rationale !== undefined && { rationale: inserted.rationale }),
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
    <div className="container-mobile">
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-8 safe-area-top">
        {/* Back button for non-Pieces tabs */}
        {activeTab !== 'pieces' ? (
          <button
            onClick={() => {
              console.log('ClosetView: Back button clicked, setting activeTab to pieces');
              setActiveTab('pieces');
            }}
            className="back-button"
          >
            <ArrowLeft size={20} />
          </button>
        ) : (
          <div className="w-10" /> // Spacer
        )}

        {/* Tab Navigation */}
        <div className="flex-1 mx-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-1 grid grid-cols-3 gap-1">
            {(['outfits','fits','collections'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab === 'outfits' ? 'pieces' : tab)}
                className={`${
                  (tab === 'outfits' && activeTab === 'pieces') || (tab !== 'outfits' && activeTab === tab)
                    ? 'bg-black text-white shadow-sm' 
                    : 'text-gray-600 hover:text-black'
                } rounded-xl py-2 text-sm font-semibold capitalize transition-all`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="flex-1">
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
            onAddPiece={() => setShowUploadOptions(true)}
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
          <div className="flex-1">
            {/* Clean Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={() => setEditingOutfit(null)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="back-button"
                >
                  <ArrowLeft size={20} />
                </motion.button>
                <h1 className="text-heading">{editingOutfit.name}</h1>
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

        {/* Web Search Modal */}
        <WebSearchModal
          isOpen={showWebSearch}
          onClose={() => setShowWebSearch(false)}
          onSelectImage={handleWebImageSelect}
        />

        {/* Upload Options Action Sheet */}
        <AnimatePresence>
          {showUploadOptions && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50"
                onClick={() => setShowUploadOptions(false)}
              />
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50"
                style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
              >
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
                <h3 className="text-xl font-bold text-black mb-4" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 700 }}>
                  Add New Piece
                </h3>
                <div className="space-y-3">
                  {/* Camera disabled temporarily */}
                  {/* <button
                    onClick={handleCameraCapture}
                    className="w-full bg-black text-white font-semibold py-4 px-6 rounded-2xl text-base transition-all hover:bg-gray-900 flex items-center justify-center gap-3"
                  >
                    <CameraIcon size={20} />
                    Take Photo
                  </button> */}
                  <button
                    onClick={handleGalleryUpload}
                    className="w-full bg-black text-white font-semibold py-4 px-6 rounded-2xl text-base transition-all hover:bg-gray-900 flex items-center justify-center gap-3"
                  >
                    <ImageIcon size={20} />
                    Choose from Gallery
                  </button>
                  <button
                    onClick={() => {
                      setShowUploadOptions(false);
                      setShowWebSearch(true);
                    }}
                    className="w-full bg-gray-100 text-black font-semibold py-4 px-6 rounded-2xl text-base transition-all hover:bg-gray-200 flex items-center justify-center gap-3"
                  >
                    <Globe size={20} />
                    Search Online
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}