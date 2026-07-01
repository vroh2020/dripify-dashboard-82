/**
 * ClosetView — pieces-only workspace post-navigation refactor.
 *
 * After "Fits" became its own top-level tab at /fits, this view owns a
 * single job: collect and display the wardrobe (capture, upload, filter,
 * detail). Data fetching lives in the shared `useClosetData` hook so the
 * Closet and Fits tabs stay in sync without manual refreshes.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera as CameraIcon,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import {
  removeBackgroundFromBlob,
  isBackgroundRemovalAvailable,
} from '@/utils/backgroundRemoval';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import PiecesTab from './PiecesTab';
import ItemDetailModal from './ItemDetailModal';
import { useClosetData, type ClosetItem } from '@/hooks/useClosetData';

// ClosetItem is owned by `useClosetData` — import-only here, no re-export
// to avoid two valid import paths for the same structural type.

// Filter chips for the chip strip. Field keys mirror the schema columns
// on `trendza_closet_items`. Inline rather than dynamic so the order +
// labels stay designer-controlled.
const FILTER_CHIPS: Array<{ key: string; value: string; label: string }> = [
  { key: 'category', value: 'tops', label: 'Tops' },
  { key: 'category', value: 'bottoms', label: 'Bottoms' },
  { key: 'category', value: 'shoes', label: 'Shoes' },
  { key: 'category', value: 'accessories', label: 'Accessories' },
  { key: 'season', value: 'spring', label: 'Spring' },
  { key: 'season', value: 'summer', label: 'Summer' },
  { key: 'season', value: 'fall', label: 'Fall' },
  { key: 'season', value: 'winter', label: 'Winter' },
];

/**
 * Upload progress overlay — visible while background-removal + storage
 * upload + AI classify are running. Shows a thin progress bar + Cancel.
 */
function UploadOverlay({
  progress,
  fileName,
  onCancel,
}: {
  progress: number;
  fileName: string;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Uploading"
    >
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-gray-900" strokeWidth={1.75} />
          </div>
          <p className="text-base font-bold text-gray-900">
            Adding to your closet
          </p>
          <p className="text-xs text-gray-500 mt-1 truncate">{fileName}</p>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
          <motion.div
            animate={{ width: `${Math.max(progress, 4)}%` }}
            transition={{ duration: 0.3 }}
            className="h-full bg-black rounded-full"
          />
        </div>
        <p className="text-xs text-gray-500 text-center mb-4">{progress}%</p>
        <button
          onClick={onCancel}
          className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

export default function ClosetView() {
  const { toast } = useToast();
  const {
    items,
    isInitialLoad,
    loadError,
    retry,
    toggleFavorite,
    insertItem,
  } = useClosetData();

  const [selectedItem, setSelectedItem] = useState<ClosetItem | null>(null);
  const [activeFilters, setActiveFilters] =
    useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const cancelUploadRef = useRef(false);

  const filteredItems = useMemo(() => {
    const filters = Object.entries(activeFilters);
    if (filters.length === 0) return items;
    return items.filter((item) => {
      for (const [k, val] of filters) {
        const field = (item as Record<string, unknown>)[k];
        if (field == null) return false;
        if (String(field).toLowerCase() !== String(val).toLowerCase()) {
          return false;
        }
      }
      return true;
    });
  }, [items, activeFilters]);

  const toggleFilterChip = (chip: { key: string; value: string }) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      if (next[chip.key] === chip.value) {
        delete next[chip.key];
      } else {
        next[chip.key] = chip.value;
      }
      return next;
    });
  };

  const clearFilters = () => setActiveFilters({});

  /**
   * Single-image upload pipeline. Takes a base64 dataURL, runs background
   * removal (if available), uploads to a public Supabase storage bucket,
   * inserts a placeholder row so the user sees the piece immediately
   * (with an "Analyzing" title), then fires off the AI classifier to
   * fill in title / category / color / etc.
   */
  const processSingleImage = async (dataUrl: string, label: string) => {
    if (cancelUploadRef.current) return;
    setCurrentFileName(label);
    setIsUploading(true);
    setUploadProgress(8);

    try {
      setUploadProgress(20);
      const blob = await fetch(dataUrl).then((r) => r.blob());
      let processedBlob: Blob = blob;
      if (isBackgroundRemovalAvailable()) {
        try {
          processedBlob = (await removeBackgroundFromBlob(blob)) ?? blob;
        } catch {
          // Fallback to original on AI failure.
        }
      }
      setUploadProgress(45);

      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) throw new Error('Not signed in');

      // Path includes `auth.user.id` — required by the existing
      // `style_images` bucket's RLS policy that scopes reads by owner via
      // `(storage.foldername(name))[1] = auth.uid()`.
      const storagePath = `closet/${auth.user.id}/${Date.now()}_no_bg.png`;

      const { error: uploadError } = await supabase.storage
        .from('style_images')
        .upload(storagePath, processedBlob, {
          cacheControl: '3600',
          contentType: 'image/png',
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage
        .from('style_images')
        .getPublicUrl(storagePath);
      setUploadProgress(70);

      const { data: row, error: insertErr } = await supabase
        .from('trendza_closet_items')
        .insert({
          user_id: auth.user.id,
          title: 'Analyzing...',
          category: 'tops',
          color: 'unknown',
          tags: [],
          attributes: {},
          source_image_url: pub.publicUrl,
        })
        .select(
          'id, title, brand, category, color, season, tags, attributes, source_image_url, created_at'
        )
        .single();
      if (insertErr || !row) throw insertErr ?? new Error('Insert failed');

      // Surface placeholder immediately; AI classify fills it in below.
      insertItem(row as ClosetItem);
      setUploadProgress(82);

      try {
        // Contract: `analyze-closet-item` expects a base64 image string
        // under `image`. Sending the public URL would either fail or
        // return an empty result. Read the blob back through FileReader
        // to keep alignment with the deployed function contract.
        const base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(processedBlob);
        });
        const { data: aiData } = await supabase.functions.invoke(
          'analyze-closet-item',
          { body: { image: base64Image } }
        );
        const payload = (aiData as any)?.result ?? aiData;
        if (payload && (payload.title || payload.category)) {
          await supabase
            .from('trendza_closet_items')
            .update({
              title: payload.title ?? 'Untitled',
              category: payload.category ?? 'tops',
              color: payload.color ?? 'unknown',
              season: payload.season ?? null,
              tags: payload.tags ?? [],
              attributes: payload.attributes ?? {},
              brand: payload.brand ?? '',
            })
           
            .eq('id', row.id);
        }
      } catch {
        // Best-effort; placeholder is fine.
      }

      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 600);
    } catch (e: any) {
      console.error('Upload failed:', e);
      setIsUploading(false);
      toast({
        title: "Couldn't add that piece",
        description: e?.message ?? 'Something went wrong',
        variant: 'destructive',
      });
    }
  };

  const handleCameraCapture = async () => {
    setShowUploadSheet(false);
    // iOS first-run: must explicitly request camera permission or the
    // Capacitor plugin fails silently with an opaque capture error.
    const camPerms = await Camera.checkPermissions();
    if (camPerms.camera !== 'granted') {
      const requested = await Camera.requestPermissions({
        permissions: ['camera'],
      });
      if (requested.camera !== 'granted') {
        toast({
          title: 'Camera access required',
          description: 'Grant camera access in Settings to scan pieces.',
          variant: 'destructive',
        });
        return;
      }
    }
    const result = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
      quality: 90,
    });
    if (cancelUploadRef.current) return;
    await processSingleImage(
      `data:image/jpeg;base64,${result.base64String}`,
      'Camera'
    );
  };

  const handleGalleryUpload = async () => {
    setShowUploadSheet(false);
    // Same permission gate as camera — separate Photos scope in the
    // Capacitor plugin so both must be granted independently.
    const photoPerms = await Camera.checkPermissions();
    if (photoPerms.photos !== 'granted') {
      const requested = await Camera.requestPermissions({
        permissions: ['photos'],
      });
      if (requested.photos !== 'granted') {
        toast({
          title: 'Photo library access required',
          description: 'Grant Photos access in Settings to upload pieces.',
          variant: 'destructive',
        });
        return;
      }
    }
    const result = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      source: CameraSource.Photos,
      quality: 90,
    });
    if (cancelUploadRef.current) return;
    await processSingleImage(
      `data:image/jpeg;base64,${result.base64String}`,
      'Gallery'
    );
  };

  const handleCancel = () => {
    cancelUploadRef.current = true;
    setIsUploading(false);
    toast({
      title: 'Upload cancelled',
      description: 'The piece was not added.',
    });
  };

  // Cancel-ref re-arm is handled by the useEffect below — single source
  // of truth instead of fighting inline-vs-effect ordering.
  const handleAddPiece = () => {
    setShowUploadSheet(true);
  };

  // Re-arm the cancel ref each time the picker is opened fresh, so a
  // previous cancellation never silently drops a new upload.
  useEffect(() => {
    if (showUploadSheet) cancelUploadRef.current = false;
  }, [showUploadSheet]);

  return (
    <div className="px-4 pb-nav-fab min-h-full relative">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="pt-2"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)',
        }}
      >
        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">
          Your Closet
        </p>
        <h1 className="text-[34px] font-bold text-black tracking-tight leading-tight">
          Wardrobe
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {items.length} {items.length === 1 ? 'piece' : 'pieces'}
        </p>
      </motion.div>

      {/* Filter chip strip */}
      <div className="flex gap-2 overflow-x-auto pb-3 mt-4 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTER_CHIPS.map((chip) => {
          const isActive = activeFilters[chip.key] === chip.value;
          return (
            <button
              key={`${chip.key}-${chip.value}`}
              onClick={() => toggleFilterChip(chip)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
                isActive
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
        {Object.keys(activeFilters).length > 0 && (
          <button
            onClick={clearFilters}
            className="flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Pieces grid (PiecesTab handles its own empty + add tile) */}
      {!isInitialLoad && (
        <PiecesTab
          items={items}
          filteredItems={filteredItems}
          isUploading={isUploading}
          freeLimit={Number.POSITIVE_INFINITY}
          filterChips={[]}
          activeFilters={activeFilters}
          onToggleFilter={(k: string) => {
            const chip = FILTER_CHIPS.find(
              (c) => `${c.key}-${c.value}` === k
            );
            if (chip) toggleFilterChip(chip);
          }}
          onClearFilters={clearFilters}
          onAddPiece={handleAddPiece}
          onItemClick={(it) => setSelectedItem(it)}
          onToggleFavorite={(id) => toggleFavorite(id)}
        />
      )}

      {isInitialLoad && (
        <div
          className="grid grid-cols-3 gap-4 mt-4"
          aria-busy="true"
          aria-live="polite"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-2xl bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      )}

      {loadError && !isInitialLoad && (
        <div className="mt-12 text-center px-4">
          <p className="text-base font-semibold text-gray-900">
            Couldn't load your closet
          </p>
          <p className="text-sm text-gray-500 mt-1">{loadError}</p>
          <button
            onClick={retry}
            className="mt-4 px-4 py-2 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-900 flex items-center gap-1.5 mx-auto transition-colors"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={2.5} />
            Try again
          </button>
        </div>
      )}

      <ItemDetailModal
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onToggleFavorite={(id) => toggleFavorite(id)}
      />

      <AnimatePresence>
        {showUploadSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
            onClick={() => setShowUploadSheet(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Add a piece"
          >
            <motion.div
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full p-6 pb-safe shadow-2xl rounded-t-3xl"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5" />
              <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-4">
                Add a piece
              </h3>
              <div className="space-y-2">
                <button
                  onClick={handleCameraCapture}
                  className="w-full bg-gray-50 hover:bg-gray-100 rounded-2xl p-4 flex items-center gap-3 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
                    <CameraIcon className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">Take photo</p>
                    <p className="text-xs text-gray-500">Use your camera</p>
                  </div>
                </button>
                <button
                  onClick={handleGalleryUpload}
                  className="w-full bg-gray-50 hover:bg-gray-100 rounded-2xl p-4 flex items-center gap-3 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">Choose photo</p>
                    <p className="text-xs text-gray-500">From your gallery</p>
     
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isUploading && (
          <UploadOverlay
            progress={uploadProgress}
            fileName={currentFileName}
            onCancel={handleCancel}
          />
        )}
      </AnimatePresence>

      <button
        onClick={handleAddPiece}
        aria-label="Add piece"
        className="fixed right-5 w-14 h-14 bg-black rounded-full flex items-center justify-center shadow-lg hover:bg-gray-900 z-40 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
        style={{
          bottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 20px)',
        }}
      >
        <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
      </button>
    </div>
  );
}
