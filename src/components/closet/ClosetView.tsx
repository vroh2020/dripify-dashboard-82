import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ArrowLeft, Camera as CameraIcon, Image as ImageIcon, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { removeBackgroundFromBlob, isBackgroundRemovalAvailable, isModelLoading } from '@/utils/backgroundRemoval';
import { Capacitor } from '@capacitor/core';

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
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [editingOutfit, setEditingOutfit] = useState<Outfit | null>(null);
  const [currentOutfit, setCurrentOutfit] = useState<ClosetItem[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ClosetItem | null>(null);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>(''); // Status message for user
  const FREE_LIMIT = 10;
  
  // Batch processing config - process multiple images efficiently
  const BATCH_SIZE = 3; // Process images in batches for better throughput

  // Cache and loading state to prevent duplicate loads
  const loadingRef = useRef(false);
  const lastLoadTimeRef = useRef<number>(0);
  const CACHE_DURATION = 30000; // 30 seconds cache

  // Load items and outfits from Supabase (real data, no mocks) with caching
  const loadData = useCallback(async () => {
    // Prevent duplicate concurrent loads
    if (loadingRef.current) {
      return;
    }

    // Check cache - don't reload if data was loaded recently
    const now = Date.now();
    if (now - lastLoadTimeRef.current < CACHE_DURATION && items.length > 0) {
      return;
    }

    loadingRef.current = true;
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      
      if (authError || !auth?.user) {
        return;
      }

      // Load items and outfits in parallel for maximum speed
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
      
      let normalizedItems: ClosetItem[] = [];
      if (!itemsErr && itemRows) {
        normalizedItems = itemRows
          .filter((r: any) => {
            const hasImage = r.source_image_url;
            const hasValidTitle = r.title && r.title !== 'Untitled' && r.title !== 'Analyzing...';
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
        
        setItems(normalizedItems);
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
      }
      
      lastLoadTimeRef.current = Date.now();
    } catch (e) {
      // Silent error handling - data will reload on next attempt
    } finally {
      loadingRef.current = false;
    }
  }, [items.length]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🚀 SMART BATCH PROCESSING - Process 2-3 images at a time for optimal speed + stability!
  const processMultipleImages = async (files: File[]) => {
    if (files.length === 0) return;
    
    setUploadProgress({ current: 0, total: files.length });
    setUploadStatus('Preparing images...');
    setIsUploading(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        setIsUploading(false);
        setUploadProgress(null);
        setUploadStatus('');
        return;
      }

      // Step 1: Check if model needs loading (show status)
      if (isModelLoading()) {
        setUploadStatus('Loading AI Model...');
      }

      // Step 2: Process images in smart batches (2-3 at a time)
      const processedBlobs: Blob[] = [];
      let processedCount = 0;

      // Process files in batches
      for (let batchStart = 0; batchStart < files.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, files.length);
        const batch = files.slice(batchStart, batchEnd);

        // Update status message
        if (batchStart === 0 && isModelLoading()) {
          setUploadStatus('Loading AI Model...');
        } else {
          setUploadStatus(`Processing ${batchStart + 1}-${batchEnd} of ${files.length}...`);
        }

        // Process batch in parallel (limited by backgroundRemoval's concurrent lock)
        const batchPromises = batch.map(async (file) => {
          try {
            const blob = await file.arrayBuffer().then(b => new Blob([b], { type: file.type }));
            
            if (isBackgroundRemovalAvailable()) {
              try {
                return await removeBackgroundFromBlob(blob);
              } catch (error) {
                console.warn('Background removal failed for one image, using original:', error);
                return blob;
              }
            }
            return blob;
          } catch (error) {
            console.error('Error processing image in batch:', error);
            // Return original blob on error
            const blob = await file.arrayBuffer().then(b => new Blob([b], { type: file.type }));
            return blob;
          }
        });

        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises);
        processedBlobs.push(...batchResults);
        processedCount += batchResults.length;

        // Update progress after batch completes
        setUploadProgress({ current: processedCount, total: files.length });
      }

      // Step 3: Upload and save images sequentially (to avoid overwhelming API)
      setUploadStatus('Uploading to closet...');
      
      for (let i = 0; i < processedBlobs.length; i++) {
        const processedBlob = processedBlobs[i];
        if (processedBlob) {
          await processAndSaveImage(processedBlob, null, false); // false = don't update isUploading
          
          // ✅ FIXED: Update progress AFTER processing completes (not before!)
          setUploadProgress({ current: i + 1, total: files.length });
        }
      }

      setUploadStatus('Complete!');
      
      // Brief delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error('❌ Batch upload error:', error);
      setUploadStatus('Error occurred. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      setUploadStatus('');
    }
  };

  const processAndSaveImage = async (blob: Blob, sourceUrl: string | null = null, updateUploadingState: boolean = true) => {
    try {
      if (updateUploadingState) {
        setIsUploading(true);
      }
      
      // Background removal is now handled in batch processing
      // So we use the blob as-is (it's already processed)
      const processedBlob = blob;

      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        if (updateUploadingState) {
          setIsUploading(false);
        }
        return;
      }

      // Upload image to storage
      const timestamp = Date.now();
      const storagePath = `closet/${auth.user.id}/${timestamp}_no_bg.png`;
      
      const { error: uploadErr } = await supabase.storage
        .from('style_images')
        .upload(storagePath, processedBlob, { cacheControl: '3600', upsert: false });
      
      let publicUrl = sourceUrl || '';
      if (!uploadErr) {
        const { data: publicUrlData } = supabase.storage
          .from('style_images')
          .getPublicUrl(storagePath);
        publicUrl = publicUrlData?.publicUrl || sourceUrl || '';
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
                try {
                  const errorJson = JSON.parse(errorText);
                  if (errorJson.error) {
                    throw new Error(errorJson.error);
                  }
                } catch (e) {
                  throw new Error(`Edge function error (${response.status}): ${errorText.substring(0, 200)}`);
                }
              }
            } catch (fetchErr: any) {
              // Silent fallback
            }
          }
        } catch (err: any) {
          aiError = err;
        }
        
        if (aiError) {
          let errorMessage = 'AI analysis failed';
          if (aiError.message) {
            errorMessage = aiError.message;
          }
          throw new Error(errorMessage);
        }
        
        if (!analysis) {
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
        }
      } catch (aiError: any) {
        // Use default values on error
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

      const { data: inserted, error: insertErr } = await supabase
        .from('trendza_closet_items')
        .insert(toInsert)
        .select('id, title, brand, category, color, season, tags, attributes, source_image_url, created_at')
        .single();
        
      if (!insertErr && inserted) {
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
      } else {
        throw new Error('Database save failed');
      }
    } catch (error) {
      // Error handling - user will see upload failure
      console.error('Error processing image:', error);
    } finally {
      if (updateUploadingState) {
        setIsUploading(false);
      }
    }
  };

  const handleCameraCapture = async () => {
    setShowUploadOptions(false);
    try {
      const isCapacitor = Capacitor?.isNativePlatform?.() || false;
      
      if (!isCapacitor) {
        // Web: Use file input with camera preference
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = async (e) => {
          const files = Array.from((e.target as HTMLInputElement).files || []);
          if (files.length > 0) {
            await processMultipleImages(files);
          }
        };
        input.click();
        return;
      }

      // Native: Use Capacitor Camera with permission check
      console.log('📷 Starting camera capture...');
      
      // Check camera permissions
      const cameraPermissions = await Camera.checkPermissions();
      if (cameraPermissions.camera !== 'granted') {
        const requested = await Camera.requestPermissions({ permissions: ['camera'] });
        if (requested.camera !== 'granted') {
          console.error('Camera permission denied');
          return;
        }
      }
      
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        correctOrientation: true,
        width: 1024,
        height: 1024,
        presentationStyle: 'popover'
      });

      if (!image.dataUrl) return;

      const response = await fetch(image.dataUrl);
      const blob = await response.blob();
      await processAndSaveImage(blob);

    } catch (error) {
      console.error('❌ Camera capture error:', error);
    }
  };

  const handleGalleryUpload = async () => {
    setShowUploadOptions(false);
    try {
      const isCapacitor = Capacitor?.isNativePlatform?.() || false;
      
      if (!isCapacitor) {
        // Web: Use file input with multiple selection enabled
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true; // Allow multiple image selection
        input.onchange = async (e) => {
          const files = Array.from((e.target as HTMLInputElement).files || []);
          if (files.length > 0) {
            await processMultipleImages(files);
          }
        };
        input.click();
        return;
      }

      // Native iOS: Loop to allow selecting multiple images
      // Keep asking until user cancels or says no to adding more
      
      // Check photo library permissions first
      const photoPermissions = await Camera.checkPermissions();
      if (photoPermissions.photos !== 'granted') {
        const requested = await Camera.requestPermissions({ permissions: ['photos'] });
        if (requested.photos !== 'granted') {
          console.error('Photo library permission denied');
          return;
        }
      }
      
      const selectedImages: Blob[] = [];
      let userWantsMore = true;
      let isFirstImage = true;

      while (userWantsMore) {
        try {
          const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.DataUrl,
            source: CameraSource.Photos,
            correctOrientation: true,
            width: 1024,
            height: 1024,
            presentationStyle: 'popover'
          });

          if (image.dataUrl) {
            const response = await fetch(image.dataUrl);
            const blob = await response.blob();
            selectedImages.push(blob);
            
            // After each selection, ask if user wants to add more
            // Skip confirmation for first image to make flow smoother
            if (isFirstImage) {
              isFirstImage = false;
              // Automatically continue for first image
              userWantsMore = true;
            } else {
              // Ask if user wants to add more after subsequent images
              const wantsMore = window.confirm(
                `Added ${selectedImages.length} image${selectedImages.length > 1 ? 's' : ''}.\n\nAdd another image?`
              );
              userWantsMore = wantsMore;
            }
          } else {
            userWantsMore = false;
          }
        } catch (error: any) {
          // User cancelled or error occurred - stop the loop
          // If we have at least one image, that's fine - process what we have
          if (selectedImages.length > 0) {
            userWantsMore = false; // Process the images we have
          } else {
            // No images selected, user cancelled
            userWantsMore = false;
          }
          // Don't log user cancellation as an error
          if (!error?.message?.includes('User cancelled') && !error?.message?.includes('cancel')) {
            console.error('Gallery selection error:', error);
          }
        }
      }

      if (selectedImages.length > 0) {
        // Convert blobs to files for batch processing
        const files = selectedImages.map((blob, index) => 
          new File([blob], `image_${index}.jpg`, { type: blob.type || 'image/jpeg' })
        );
        await processMultipleImages(files);
      }

    } catch (error) {
      console.error('❌ Gallery upload error:', error);
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

      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
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
        setIsSaving(false);
        return;
      }

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
        setIsSaving(false);
        return;
      }

      if (inserted) {
        
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
            onClick={() => setActiveTab('pieces')}
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
          <div className="flex-1 bg-white min-h-screen">
            {/* Clean Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={() => setEditingOutfit(null)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft size={20} className="text-gray-900" />
                </motion.button>
                <h1 className="text-2xl font-bold text-gray-900">{editingOutfit.name}</h1>
              </div>
            </div>

            {/* Clean Outfit Display - Vertical Stack Like FitsTab */}
            <div className="flex-1 flex items-center justify-center p-6 w-full">
              <div className="flex flex-col items-center space-y-6">
                {editingOutfit.items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="w-36 h-36 flex items-center justify-center"
                  >
                    {item.source_image_url ? (
                      <img
                        src={item.source_image_url}
                        alt={item.title}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
                        <Sparkles className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
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
                  <button
                    onClick={handleCameraCapture}
                    className="w-full bg-black text-white font-semibold py-4 px-6 rounded-2xl text-base transition-all hover:bg-gray-900 flex items-center justify-center gap-3"
                  >
                    <CameraIcon size={20} />
                    Take Photo
                  </button>
                  <button
                    onClick={handleGalleryUpload}
                    className="w-full bg-black text-white font-semibold py-4 px-6 rounded-2xl text-base transition-all hover:bg-gray-900 flex items-center justify-center gap-3"
                  >
                    <ImageIcon size={20} />
                    Choose from Gallery
                  </button>
                  <p className="text-xs text-gray-500 text-center -mt-2 mb-1">
                    {Capacitor?.isNativePlatform?.() 
                      ? 'Select multiple images from your gallery' 
                      : 'Select multiple images at once'}
                  </p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Upload Progress Overlay */}
        <AnimatePresence>
          {uploadProgress && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4"
              >
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-black mb-2" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 700 }}>
                    Processing Images
                  </h3>
                  <p className="text-gray-600 mb-4 min-h-[1.5rem]">
                    {uploadStatus || 'Removing backgrounds and uploading...'}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <motion.div
                      className="bg-black h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    {uploadProgress.current} of {uploadProgress.total} images
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}