'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CalendarPlus, Loader2, AlertCircle, CheckCircle2, Camera, Pencil } from 'lucide-react';

interface DayViewProps {
  date: Date;
  /** The try-on image URL (null if not yet generated) */
  tryOnImageUrl: string | null;
  /** Generation status */
  generationStatus: 'idle' | 'pending' | 'generating' | 'completed' | 'failed' | null;
  /** The outfit name if one is planned */
  outfitName?: string;
  /** Whether the user has any saved outfits to plan */
  hasOutfits: boolean;
  /** Called when the user taps "Plan an outfit" or "+ Plan" */
  onPlanOutfit: () => void;
  /** Called when the user wants to change the planned outfit */
  onChangeOutfit: () => void;
  /** Called when the user wants to remove the planned outfit */
  onRemoveOutfit: () => void;
  /** Error message if generation failed */
  errorMessage?: string | null;
  /** Whether the user has uploaded a base photo (null = checking) */
  hasBasePhoto?: boolean | null;
  /** Called when the user wants to upload a base photo */
  onUploadPhoto?: () => void;
}

/**
 * Determine which keyed view state to render.
 * Returns a single canonical state so AnimatePresence never sees
 * competing children from independent conditional branches.
 */
type ViewState =
  | { kind: 'empty' }
  | { kind: 'generating' }
  | { kind: 'completed'; imageUrl: string; outfitName?: string }
  | { kind: 'failed'; errorMessage?: string | null };

function computeViewState(
  generationStatus: DayViewProps['generationStatus'],
  tryOnImageUrl: string | null,
  outfitName: string | undefined,
  errorMessage: string | null | undefined,
): ViewState {
  const isGenerating = generationStatus === 'pending' || generationStatus === 'generating';
  if (generationStatus === null || generationStatus === 'idle') return { kind: 'empty' };
  if (generationStatus === 'completed' && tryOnImageUrl) {
    return { kind: 'completed', imageUrl: tryOnImageUrl, outfitName };
  }
  if (generationStatus === 'failed' && !isGenerating) {
    return { kind: 'failed', errorMessage };
  }
  if (isGenerating) return { kind: 'generating' };
  // Fallback: empty
  return { kind: 'empty' };
}

/**
 * The main photo card area for Day view.
 *
 * States (mutually exclusive, keyed for AnimatePresence):
 * - empty:  No outfit planned → CTA
 * - generating:  Loading skeleton with spinner
 * - completed:  Full try-on photo card
 * - failed:  Error state with retry
 */
export function DayView({
  date,
  tryOnImageUrl,
  generationStatus,
  outfitName,
  hasOutfits,
  onPlanOutfit,
  onChangeOutfit,
  onRemoveOutfit,
  errorMessage,
  hasBasePhoto,
  onUploadPhoto,
}: DayViewProps) {
  // Format: "Wednesday, Aug 6"
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const viewState = computeViewState(
    generationStatus,
    tryOnImageUrl,
    outfitName,
    errorMessage,
  );

  return (
    <div className="flex flex-1 flex-col px-4 pb-4">
      {/* Date label */}
      <motion.p
        key={formattedDate}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-[15px] font-medium text-muted-foreground mb-3"
      >
        {formattedDate}
      </motion.p>

      <AnimatePresence mode="wait">
        {viewState.kind === 'empty' && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="flex flex-1 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-muted-foreground/25 bg-muted/20"
          >
            <div className="flex flex-col items-center gap-4 px-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <CalendarPlus className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Plan an outfit for this day
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {hasBasePhoto === false
                  ? 'Upload a photo of yourself first so the AI can generate realistic try-on images.'
                  : hasOutfits
                    ? 'Choose one of your saved outfits to wear on this day.'
                    : 'Create an outfit first, then plan it for a specific day.'}
              </p>

              {hasBasePhoto === false && onUploadPhoto ? (
                <div className="flex flex-col gap-2 mt-2 w-full">
                  <button
                    type="button"
                    onClick={onUploadPhoto}
                    className="w-full rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.97] flex items-center justify-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Upload Your Photo
                  </button>
                  <button
                    type="button"
                    onClick={onPlanOutfit}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip — use style collage instead
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onPlanOutfit}
                  className="mt-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.97]"
                >
                  {hasOutfits ? '+ Plan Outfit' : 'Create Outfit'}
                </button>
              )}

              {/* Allow changing the base photo even after initial upload */}
              {hasBasePhoto && onUploadPhoto && (
                <button
                  type="button"
                  onClick={onUploadPhoto}
                  className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <Pencil className="h-3 w-3" />
                  Change base photo
                </button>
              )}
            </div>
          </motion.div>
        )}

        {viewState.kind === 'generating' && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col rounded-3xl bg-muted/30 overflow-hidden"
          >
            {/* Skeleton card */}
            <div className="relative flex-1 bg-muted/40 animate-pulse flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground/60" />
                <p className="text-sm font-medium text-muted-foreground">Generating try-on...</p>
                <p className="text-xs text-muted-foreground/60">AI is preparing your look</p>
              </div>
            </div>
            {/* Bottom info bar */}
            <div className="flex items-center gap-2 border-t border-border/40 px-5 py-3">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-foreground">
                {outfitName ?? 'Planned Outfit'}
              </span>
            </div>
          </motion.div>
        )}

        {viewState.kind === 'completed' && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="flex flex-1 flex-col rounded-3xl bg-card overflow-hidden shadow-sm border border-border/50"
          >
            {/* Try-on image */}
            <div className="relative flex-1 bg-gradient-to-b from-muted/50 to-background">
              <img
                src={viewState.imageUrl}
                alt={`Try-on for ${viewState.outfitName ?? 'outfit'}`}
                className="h-full w-full object-contain"
              />
              {/* Status badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-sm px-3 py-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                <span className="text-[11px] font-medium text-white">AI Try-On</span>
              </div>
            </div>
            {/* Bottom info bar with actions */}
            <div className="flex items-center justify-between border-t border-border/40 px-5 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {viewState.outfitName ?? 'Planned Outfit'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasBasePhoto && (
                  <button
                    type="button"
                    onClick={onUploadPhoto}
                    title="Change base photo"
                    className="rounded-full bg-muted p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onChangeOutfit}
                  className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={onRemoveOutfit}
                  className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {viewState.kind === 'failed' && (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col rounded-3xl bg-red-50/40 border border-red-200/50 overflow-hidden"
          >
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8">
              <AlertCircle className="h-10 w-10 text-red-400" strokeWidth={1.5} />
              <h3 className="text-base font-semibold text-foreground">Generation failed</h3>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                {viewState.errorMessage ?? 'Something went wrong while generating the try-on image.'}
              </p>
              <button
                type="button"
                onClick={onChangeOutfit}
                className="mt-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-all hover:opacity-90"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
