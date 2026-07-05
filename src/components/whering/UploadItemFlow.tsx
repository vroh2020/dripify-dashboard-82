"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  Image as ImageIcon,
  X,
  Check,
  Sparkles,
} from "lucide-react";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { useUnifiedBackgroundRemoval } from "@/hooks/useUnifiedBackgroundRemoval";
import { supabase } from "@/integrations/supabase/client";
import type { ClosetItem } from "@/hooks/useClosetData";
import { thrust, successTick } from "@/lib/haptics";

type Stage = "capture" | "processing" | "name" | "done";

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
  const [preview, setPreview] = useState<string | null>(null);
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
    setPreview(null);
    // Same Object-URL-vs-public-URL guard as the unmount cleanup —
    // only revoke if the previous value was an Object URL.
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
          setPreview(photo.dataUrl);
          startProcessing(photo.dataUrl);
        }
      } else {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.capture = "environment";
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const dataUrl = ev.target?.result as string;
              setPreview(dataUrl);
              startProcessing(dataUrl);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
    } catch (e: any) {
      if (e.message?.includes("cancelled") || e.message?.includes("Cancelled")) return;
      setError(e.message || "Failed to open camera");
    }
  };

  // Gallery pick
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
        const photo = await CapacitorCamera.getPhoto({
          quality: 90,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
          correctOrientation: true,
          width: 1024,
          height: 1024,
        });
        if (photo.dataUrl) {
          setPreview(photo.dataUrl);
          startProcessing(photo.dataUrl);
        }
      } else {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const dataUrl = ev.target?.result as string;
              setPreview(dataUrl);
              startProcessing(dataUrl);
            };
            reader.readAsDataURL(file);
          }
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

      // AI classification in background
      if (rawBlob) {
        try {
          const reader = new FileReader();
          const base64Image = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(rawBlob);
          });
          const { data: aiData } = await supabase.functions.invoke(
            "analyze-closet-item",
            { body: { image: base64Image } }
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
                {stage === "processing" && "Processing..."}
                {stage === "name" && "Name your item"}
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

            {/* Stage: Processing */}
            {stage === "processing" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {processedPreview && (
                  <div className="relative w-full aspect-square max-w-[240px] mx-auto rounded-2xl bg-gray-50 overflow-hidden">
                    <img
                      src={processedPreview}
                      alt="Processed"
                      className="w-full h-full object-contain p-4"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">
                      {progressLabel}
                    </span>
                    <span className="text-gray-400">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.4 }}
                      className="h-full bg-black rounded-full"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Sparkles className="w-4 h-4" />
                  <span>AI background removal active</span>
                </div>
              </motion.div>
            )}

            {/* Stage: Name */}
            {stage === "name" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                {processedPreview && (
                  <div className="relative w-28 h-28 mx-auto rounded-2xl bg-gray-50 overflow-hidden shadow-sm">
                    <img
                      src={processedPreview}
                      alt="Processed"
                      className="w-full h-full object-contain p-3"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    What do you want to call this item?
                  </label>
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder='e.g. "Cream Knit Sweater"'
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-[15px] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSubmitName();
                    }}
                  />
                </div>

                <button
                  onClick={handleSubmitName}
                  disabled={!itemName.trim()}
                  className="w-full bg-black text-white rounded-2xl py-4 font-semibold text-[15px] hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" strokeWidth={2.5} />
                  Save to Wardrobe
                </button>
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
