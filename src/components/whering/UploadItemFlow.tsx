"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Image as ImageIcon,
  X,
  Check,
  Sparkles,
  Layers,
} from "lucide-react";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { useUnifiedBackgroundRemoval } from "@/hooks/useUnifiedBackgroundRemoval";
import { supabase } from "@/integrations/supabase/client";
import type { ClosetItem } from "@/hooks/useClosetData";
import { thrust, successTick } from "@/lib/haptics";
import { BatchQueue, type QueueItem } from "./BatchQueue";
import { cn } from "@/lib/utils";

type Stage = "capture" | "review" | "processing" | "done";

interface UploadItemFlowProps {
  open: boolean;
  onClose: () => void;
  /** Callback from parent so the item appears in the wardrobe view immediately. */
  onItemInserted: (item: ClosetItem) => void;
  /**
   * Called when the AI classify IIFE finishes a successful UPDATE on
   * the just-inserted row. Parent should call its own
   * useClosetData.updateItem so the local state patches in (the row
   * shifts from `category: 'pending'` to its real category and the
   * item re-slots in Shuffler / Canvas / the closet grid).
   */
  onItemUpdated?: (item: ClosetItem) => void;
}

export function UploadItemFlow({ open, onClose, onItemInserted, onItemUpdated }: UploadItemFlowProps) {
  const [stage, setStage] = useState<Stage>("capture");
  // Multi-image state
  const [selectedImages, setSelectedImages] = useState<{ id: string; dataUrl: string; file: Blob }[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [processedPreview, setProcessedPreview] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState("");
  const [uploadedItem, setUploadedItem] = useState<ClosetItem | null>(null);

  // Background removal — server-side BiRefNet via the `process-bg`
  // Edge Function. The hook returns the storage path inside
  // `clipped-closet-items` where the transparent PNG lives; we
  // resolve it to a public URL inline.
  const removeBgMutation = useUnifiedBackgroundRemoval();

  // React state instead of window globals
  const pendingUrlRef = useRef<string | null>(null);
  const pendingBlobRef = useRef<Blob | null>(null);
  const processedUrlRef = useRef<string | null>(null);
  const cancelRef = useRef(false);

  // Clean up object URLs on unmount. After the server-side bg-removal
  // switch, `processedUrlRef.current` may be either a `blob:` Object
  // URL or a public Supabase URL string — only revoke if it's an
  // Object URL (the public URL is managed by Supabase/CDN cache and
  // doesn't need explicit cleanup here).
  useEffect(() => {
    return () => {
      const v = processedUrlRef.current;
      if (v && v.startsWith('blob:')) URL.revokeObjectURL(v);
    };
  }, []);

  const reset = useCallback(() => {
    setStage("capture");
    setSelectedImages([]);
    setQueueItems([]);
    if (processedUrlRef.current?.startsWith?.('blob:')) {
      URL.revokeObjectURL(processedUrlRef.current);
    }
    processedUrlRef.current = null;
    setProcessedPreview(null);
    setItemName("");
    setProgress(0);
    setProgressLabel("");
    setError("");
    setUploadedItem(null);
    pendingUrlRef.current = null;
    pendingBlobRef.current = null;
    cancelRef.current = false;
  }, []);

  const handleClose = () => {
    cancelRef.current = true;
    reset();
    onClose();
  };

  const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return res.blob();
  };

  const addImageToSelection = useCallback((id: string, dataUrl: string, blob: Blob) => {
    setSelectedImages((prev) => [...prev, { id, dataUrl, file: blob }]);
  }, []);

  const removeFromSelection = useCallback((id: string) => {
    setSelectedImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  // Process one image: bg removal → insert → AI classify
  const processSingleImage = useCallback(async (
    img: { id: string; dataUrl: string; file: Blob },
    index: number,
    total: number,
  ): Promise<void> => {
    if (cancelRef.current) return;

    // Mark as bg-removal
    setQueueItems((prev) =>
      prev.map((q) => (q.id === img.id ? { ...q, status: "bg-removal" as const } : q)),
    );

    try {
      const cleanPath = await removeBgMutation.mutateAsync({
        imageBlob: img.file,
        originalName: `upload_${index}.png`,
      });
      const { data: pubData } = supabase.storage
        .from("clipped-closet-items")
        .getPublicUrl(cleanPath);
      const publicUrl = pubData.publicUrl;

      if (cancelRef.current) return;
      setQueueItems((prev) =>
        prev.map((q) => (q.id === img.id ? { ...q, status: "classifying" as const } : q)),
      );

      // Insert into DB
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) throw new Error("Not signed in");

      const name = `Item ${index + 1}`;
      const { data: row, error: insertErr } = await supabase
        .from("trendza_closet_items")
        .insert({
          user_id: auth.user.id,
          title: name,
          category: "pending",
          color: "unknown",
          tags: [],
          attributes: {},
          source_image_url: publicUrl,
        })
        .select("id, title, brand, category, color, season, tags, attributes, source_image_url, created_at")
        .single();

      if (insertErr || !row) throw insertErr ?? new Error("Insert failed");

      const newItem: ClosetItem = {
        id: row.id,
        title: row.title,
        brand: row.brand ?? "",
        category: row.category ?? "pending",
        color: row.color ?? "unknown",
        season: row.season ?? "all",
        tags: Array.isArray(row.tags) ? row.tags : [],
        attributes: row.attributes ?? {},
        source_image_url: row.source_image_url,
        created_at: row.created_at,
        pending: true,
      };
      onItemInserted(newItem);

      // AI classify using public URL (fast)
      if (publicUrl) {
        try {
          const { data: aiData } = await supabase.functions.invoke("analyze-closet-item", {
            body: { image: publicUrl },
          });
          const payload = (aiData as any)?.result ?? aiData;
          if (payload && (payload.title || payload.category)) {
            await supabase
              .from("trendza_closet_items")
              .update({
                category: payload.category ?? "pending",
                color: payload.color ?? "unknown",
                season: payload.season ?? null,
                tags: payload.tags ?? [],
                attributes: payload.attributes ?? {},
                brand: payload.brand ?? "",
              })
              .eq("id", row.id);
            const { data: refreshed } = await supabase
              .from("trendza_closet_items")
              .select("id, title, brand, category, color, season, tags, attributes, source_image_url, created_at")
              .eq("id", row.id)
              .single();
            if (refreshed && onItemUpdated) onItemUpdated(refreshed as ClosetItem);
          }
        } catch {
          // Best-effort
        }
      }

      setQueueItems((prev) =>
        prev.map((q) => (q.id === img.id ? { ...q, status: "done" as const } : q)),
      );
    } catch (e: any) {
      console.error(`[batch] Failed to process ${img.id}:`, e);
      setQueueItems((prev) =>
        prev.map((q) =>
          q.id === img.id ? { ...q, status: "error" as const, error: e?.message ?? "Failed" } : q,
        ),
      );
    }
  }, [removeBgMutation, onItemInserted, onItemUpdated]);

  // Process all selected images sequentially
  const processAllImages = useCallback(async () => {
    if (selectedImages.length === 0) return;

    // Build queue items
    const items: QueueItem[] = selectedImages.map((img, i) => ({
      id: img.id,
      thumbnail: img.dataUrl,
      name: `Item ${i + 1}`,
      status: "waiting" as QueueItemStatus,
    }));
    setQueueItems(items);
    setStage("processing");
    cancelRef.current = false;

    // Process one by one
    for (let i = 0; i < selectedImages.length; i++) {
      if (cancelRef.current) break;
      await processSingleImage(selectedImages[i], i, selectedImages.length);
    }

    if (!cancelRef.current) {
      successTick();
      setTimeout(() => setStage("done"), 600);
    }
  }, [selectedImages, processSingleImage]);

  const handleRemoveQueueItem = useCallback((id: string) => {
    setQueueItems((prev) => prev.filter((q) => q.id !== id));
    setSelectedImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  // Camera capture
  const handleCamera = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const perms = await CapacitorCamera.checkPermissions();
        if (perms.camera !== "granted") {
          const req = await CapacitorCamera.requestPermissions({ permissions: ["camera"] });
          if (req.camera !== "granted") {
            setError("Camera permission is required.");
            return;
          }
        }
        const photo = await CapacitorCamera.getPhoto({
          quality: 90,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          correctOrientation: true,
          width: 1024,
          height: 1024,
        });
        if (photo.dataUrl) {
          const blob = await dataUrlToBlob(photo.dataUrl);
          const id = crypto.randomUUID();
          setSelectedImages((prev) => [...prev, { id, dataUrl: photo.dataUrl, file: blob }]);
          setStage("review");
        }
      } else {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.capture = "environment";
        input.multiple = false;
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
            const blob = await dataUrlToBlob(dataUrl);
            const id = crypto.randomUUID();
            setSelectedImages((prev) => [...prev, { id, dataUrl, file: blob }]);
            setStage("review");
          }
        };
        input.click();
      }
    } catch (e: any) {
      if (e.message?.includes("cancelled") || e.message?.includes("Cancelled")) return;
      setError(e.message || "Failed to open camera");
    }
  };

  // Gallery pick — supports multiple files
  const handleGallery = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const perms = await CapacitorCamera.checkPermissions();
        if (perms.photos !== "granted") {
          const req = await CapacitorCamera.requestPermissions({ permissions: ["photos"] });
          if (req.photos !== "granted") {
            setError("Photo library access required.");
            return;
          }
        }
        // On native, pick one at a time for now
        const photo = await CapacitorCamera.getPhoto({
          quality: 90,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
          correctOrientation: true,
          width: 1024,
          height: 1024,
        });
        if (photo.dataUrl) {
          const blob = await dataUrlToBlob(photo.dataUrl);
          addImageToSelection(crypto.randomUUID(), photo.dataUrl, blob);
        }
      } else {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.multiple = true;
        input.onchange = async (e) => {
          const files = Array.from((e.target as HTMLInputElement).files ?? []);
          const newImages: { id: string; dataUrl: string; file: Blob }[] = [];
          for (const file of files) {
            const id = crypto.randomUUID();
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
            const blob = await dataUrlToBlob(dataUrl);
            newImages.push({ id, dataUrl, file: blob });
          }
          setSelectedImages((prev) => [...prev, ...newImages]);
          setStage("review");
        };
        input.click();
      }
    } catch (e: any) {
      if (e.message?.includes("cancelled") || e.message?.includes("Cancelled")) return;
      setError(e.message || "Failed to open gallery");
    }
  };

  // Background removal + upload pipeline
  const startProcessing = async (dataUrl: string) => {
    if (cancelRef.current) return;
    setStage("processing");
    setProgress(5);
    setProgressLabel("Preparing image...");

    try {
      // Convert to blob
      setProgress(15);
      setProgressLabel("Converting image...");
      const blob = await dataUrlToBlob(dataUrl);

      // Background removal — server-side BiRefNet (process-bg Edge
      // Function). On any failure, return to the capture stage and
      // surface the error rather than silently degrading.
      if (cancelRef.current) return;
      setProgress(25);
      setProgressLabel("Removing background on server...");

      let cleanPublicUrl: string;
      try {
        const cleanPath = await removeBgMutation.mutateAsync({
          imageBlob: blob,
          originalName: 'upload.png',
        });
        const { data: pubData } = supabase.storage
          .from('clipped-closet-items')
          .getPublicUrl(cleanPath);
        cleanPublicUrl = pubData.publicUrl;
      } catch (e: any) {
        console.error('[upload] bg-removal failed:', e);
        setError(e?.message || 'Background removal failed');
        setStage('capture');
        return;
      }

      if (cancelRef.current) return;

      // Show processed preview — read straight from the public URL,
      // no Object-URL round-trip needed when the source of truth is
      // remote. Stash the URL in `processedUrlRef` for cleanup
      // (the `startsWith('blob:')` guards will no-op on a public URL).
      if (processedUrlRef.current?.startsWith?.('blob:')) {
        URL.revokeObjectURL(processedUrlRef.current);
      }
      processedUrlRef.current = cleanPublicUrl;
      setProcessedPreview(cleanPublicUrl);

      if (cancelRef.current) return;
      setProgress(65);
      setProgressLabel("Saving to wardrobe...");

      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) throw new Error("Not signed in");

      // Store the public clean URL + raw blob for the AI classify
      // step. We keep the raw blob because the AI only needs the
      // image content (the bg-stripping happened upstream).
      pendingUrlRef.current = cleanPublicUrl;
      pendingBlobRef.current = blob;

      setProgress(100);
      setProgressLabel("Ready!");
      setTimeout(() => setStage("name"), 400);
    } catch (e: any) {
      console.error("Upload failed:", e);
      setError(e.message || "Something went wrong");
      setStage("capture");
    }
  };

  // Submit with name
  const handleSubmitName = async () => {
    const name = itemName.trim();
    if (!name) return;

    thrust();
    setStage("processing");
    setProgress(90);
    setProgressLabel("Saving to your wardrobe...");

    try {
      const publicUrl = pendingUrlRef.current;
      // After the server-side bg-removal switch, `pendingBlobRef` is
      // the raw image (the clean PNG lives in clipped-closet-items at
      // `publicUrl`). AI classify only reads the image content, so
      // raw is fine — same pixels, just with the original background.
      const rawBlob = pendingBlobRef.current;

      if (!publicUrl) throw new Error("No upload URL found");

      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) throw new Error("Not signed in");

      const { data: row, error: insertErr } = await supabase
        .from("trendza_closet_items")
        .insert({
          user_id: auth.user.id,
          title: name,
          category: "pending",
          color: "unknown",
          tags: [],
          attributes: {},
          source_image_url: publicUrl,
        })
        .select(
          "id, title, brand, category, color, season, tags, attributes, source_image_url, created_at"
        )
        .single();

      if (insertErr || !row) throw insertErr ?? new Error("Insert failed");

      const insertedRowId = row.id;

      const newItem: ClosetItem = {
        id: row.id,
        title: row.title,
        brand: row.brand ?? "",
        category: row.category ?? "pending",
        color: row.color ?? "unknown",
        season: row.season ?? "all",
        tags: Array.isArray(row.tags) ? row.tags : [],
        attributes: row.attributes ?? {},
        source_image_url: row.source_image_url,
        created_at: row.created_at,
        pending: (row.category ?? "pending") === "pending",
      };

      onItemInserted(newItem);
      setUploadedItem(newItem);

      // AI classification using public URL (much faster than sending full base64)
      if (publicUrl) {
        try {
          const { data: aiData } = await supabase.functions.invoke(
            "analyze-closet-item",
            { body: { image: publicUrl } }
          );
          const payload = (aiData as any)?.result ?? aiData;
          if (payload && (payload.title || payload.category)) {
            // `?? "pending"` (was `"tops"`) — see clipper.tsx for the
            // same change. Don't fabricate a category if AI doesn't
            // return one; let the user fix it from the detail modal.
            await supabase
              .from("trendza_closet_items")
              .update({
                category: payload.category ?? "pending",
                color: payload.color ?? "unknown",
                season: payload.season ?? null,
                tags: payload.tags ?? [],
                attributes: payload.attributes ?? {},
                brand: payload.brand ?? "",
              })
              .eq("id", insertedRowId);
            // Refresh local state with the mutated row so the user sees
            // the category flip on this tab without waiting on a full
            // refetch. Same SELECT-then-callback pattern as clipper.
            const { data: refreshed } = await supabase
              .from("trendza_closet_items")
              .select(
                "id, title, brand, category, color, season, tags, attributes, source_image_url, created_at"
              )
              .eq("id", insertedRowId)
              .single();
            if (refreshed && onItemUpdated) onItemUpdated(refreshed as ClosetItem);
          }
        } catch {
          // Best-effort
        }
      }

      pendingUrlRef.current = null;
      pendingBlobRef.current = null;

      setProgress(100);
      successTick();
      setTimeout(() => setStage("done"), 500);
    } catch (e: any) {
      console.error("Save failed:", e);
      setError(e.message || "Failed to save item");
      setStage("name");
    }
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
        onClick={stage === "done" ? handleClose : undefined}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={
            stage === "capture" || stage === "done" ? handleClose : undefined
          }
        />

        {/* Sheet */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-white w-full max-w-[420px] max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-3">
            <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                {stage === "capture" && "Add to Wardrobe"}
                {stage === "review" && `Review (${selectedImages.length} images)`}
                {stage === "processing" && "Processing..."}
                {stage === "done" && "Added! ✨"}
              </h2>
              {stage === "capture" && (
                <button
                  onClick={handleClose}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </div>
          </div>

          <div className="px-6 pb-8">
            {/* Stage: Capture */}
            {stage === "capture" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <p className="text-sm text-gray-500 text-center mb-2">
                  Take a photo or pick from your gallery
                </p>
                <button
                  onClick={handleCamera}
                  className="w-full bg-gray-900 hover:bg-black text-white rounded-2xl p-5 flex items-center gap-4 transition-colors active:scale-[0.98]"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                    <Camera className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-[15px]">Take Photo</p>
                    <p className="text-xs text-white/60">Use your camera</p>
                  </div>
                </button>
                <button
                  onClick={handleGallery}
                  className="w-full bg-gray-50 hover:bg-gray-100 rounded-2xl p-5 flex items-center gap-4 transition-colors active:scale-[0.98]"
                >
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <ImageIcon className="w-6 h-6 text-gray-600" strokeWidth={1.75} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-[15px] text-gray-900">
                      Choose Photo
                    </p>
                    <p className="text-xs text-gray-500">From your gallery</p>
                  </div>
                </button>
                {error && (
                  <p className="text-sm text-red-500 text-center mt-2">{error}</p>
                )}
              </motion.div>
            )}

            {/* Stage: Review — show selected images before processing */}
            {stage === "review" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <p className="text-sm text-gray-500 text-center">
                  {selectedImages.length} image{selectedImages.length !== 1 ? "s" : ""} selected — review and process
                </p>

                {/* Thumbnail grid */}
                <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {selectedImages.map((img) => (
                      <motion.div
                        key={img.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 group"
                      >
                        <img
                          src={img.dataUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeFromSelection(img.id)}
                          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Add more button */}
                <button
                  onClick={handleGallery}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
                >
                  + Add more images
                </button>

                {/* Process All button */}
                <button
                  onClick={processAllImages}
                  disabled={selectedImages.length === 0}
                  className="w-full bg-black text-white rounded-2xl py-4 font-semibold text-[15px] hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Layers className="w-5 h-5" strokeWidth={2} />
                  Process All ({selectedImages.length} image{selectedImages.length !== 1 ? "s" : ""})
                </button>

                {/* Back button */}
                <button
                  onClick={() => setStage("capture")}
                  className="w-full py-3 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Back
                </button>
              </motion.div>
            )}

            {/* Stage: Processing — shows batch queue */}
            {stage === "processing" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <BatchQueue
                  items={queueItems}
                  onRemoveItem={handleRemoveQueueItem}
                />

                {/* Cancel button */}
                {queueItems.some((q) => q.status === "waiting" || q.status === "bg-removal" || q.status === "classifying") && (
                  <button
                    onClick={() => {
                      cancelRef.current = true;
                      setStage("review");
                    }}
                    className="w-full py-3 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </motion.div>
            )}

            {/* Stage: Done */}
            {stage === "done" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
              >
                <div className="w-20 h-20 mx-auto rounded-full bg-black flex items-center justify-center">
                  <Check className="w-10 h-10 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {uploadedItem?.title ?? "Item"} added!
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    It's now in your wardrobe — style it on Canvas or Dress Me.
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="w-full bg-black text-white rounded-2xl py-4 font-semibold text-[15px] hover:bg-gray-900 transition-colors active:scale-[0.98]"
                >
                  Done
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
  );
}
