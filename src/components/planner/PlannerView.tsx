'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Camera, Upload, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { WeekStrip } from './WeekStrip';
import { DayView } from './DayView';
import { MonthView } from './MonthView';
import {
  getPlannedOutfitForDate,
  getPlannedOutfitsForRange,
  planOutfitForDate,
  unplanDate,
  saveUserBasePhoto,
  getUserBasePhoto,
  type PlannerOutfit,
  type GeneratedImage,
} from '@/services/plannerService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { SavedOutfit } from '@/hooks/useClosetData';

type ViewMode = 'day' | 'month';

interface PlannerViewProps {
  outfits: SavedOutfit[];
}

export function PlannerView({ outfits }: PlannerViewProps) {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [plannedOutfit, setPlannedOutfit] = useState<{
    planner: PlannerOutfit | null;
    image: GeneratedImage | null;
  }>({ planner: null, image: null });
  const [plannedDates, setPlannedDates] = useState<Set<string>>(new Set());
  const [generationStatuses, setGenerationStatuses] = useState<
    Map<string, 'pending' | 'generating' | 'completed' | 'failed'>
  >(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [showOutfitPicker, setShowOutfitPicker] = useState(false);

  // ── Base photo state ──────────────────────────────────────────
  const [hasBasePhoto, setHasBasePhoto] = useState<boolean | null>(null); // null = checking
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatDateStr = useCallback((d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // ── Check for base photo on mount ─────────────────────────────
  useEffect(() => {
    getUserBasePhoto().then((url) => {
      setHasBasePhoto(url !== null);
    });
  }, []);

  // ── Base photo upload handler ─────────────────────────────────
  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const url = await saveUserBasePhoto(file);
      setHasBasePhoto(true);
      setShowPhotoUpload(false);
      toast({
        title: 'Photo saved!',
        description: 'Your base photo is now stored. You can plan outfits and get AI try-on results.',
      });
      console.log('[Planner] Base photo saved:', url);
    } catch (err: any) {
      console.error('[Planner] Failed to save base photo:', err);
      toast({
        title: 'Upload failed',
        description: err?.message ?? 'Could not save photo. Try again.',
        variant: 'destructive',
      });
    } finally {
      setUploadingPhoto(false);
      // Reset the input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  // ── Polling management ─────────────────────────────────────────
  const abortControllerRef = useRef<AbortController | null>(null);

  const startPolling = useCallback(
    (genId: string, dateStr: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const signal = controller.signal;
      let cancelled = false;
      signal.addEventListener('abort', () => {
        cancelled = true;
      });

      const poll = async () => {
        let attempts = 0;
        const maxAttempts = 100; // 100 * 2s = 200s timeout (matching edge function + Space processing)

        while (!cancelled && attempts < maxAttempts) {
          try {
            // Wait 2s between polls
            await new Promise<void>((resolve, reject) => {
              const timer = setTimeout(resolve, 2000);
              if (signal.aborted) {
                clearTimeout(timer);
                reject(new DOMException('Aborted', 'AbortError'));
                return;
              }
              const onAbort = () => {
                clearTimeout(timer);
                reject(new DOMException('Aborted', 'AbortError'));
              };
              signal.addEventListener('abort', onAbort, { once: true });
            });

            if (cancelled) return;

            const { data } = await supabase
              .from('planner_generated_images')
              .select('*')
              .eq('id', genId)
              .single();

            if (!data || cancelled) {
              attempts++;
              continue;
            }

            const genImage = data as GeneratedImage;

            if (genImage.status === 'completed' || genImage.status === 'failed') {
              if (!cancelled) {
                setPlannedOutfit((prev) => ({ ...prev, image: genImage }));
                setGenerationStatuses((prev) => {
                  const next = new Map(prev);
                  next.set(dateStr, genImage.status as any);
                  return next;
                });
              }
              return; // Stop polling — we got a terminal state
            }
            attempts++;
          } catch (e: any) {
            if (e?.name === 'AbortError') return;
            attempts++;
          }
        }

        // Timeout — force-set to 'failed' in the DB itself so future
        // page loads don't re-enter the infinite loop.
        if (!cancelled) {
          console.warn('[Planner] Polling timed out for genId:', genId, '— force-setting failed');
          try {
            await supabase
              .from('planner_generated_images')
              .update({
                status: 'failed',
                error_message: 'Generation timed out after 200s',
                updated_at: new Date().toISOString(),
              })
              .eq('id', genId);
          } catch {
            // Best-effort
          }

          setPlannedOutfit((prev) => ({
            ...prev,
            image: prev.image
              ? { ...prev.image, status: 'failed' as const, error_message: 'Generation timed out' }
              : null,
          }));
          setGenerationStatuses((prev) => {
            const next = new Map(prev);
            next.set(dateStr, 'failed');
            return next;
          });
        }
      };

      poll();
    },
    [],
  );

  // ── Data loading ───────────────────────────────────────────────
  const loadDateData = useCallback(
    async (date: Date) => {
      setIsLoading(true);
      const dateStr = formatDateStr(date);
      try {
        const result = await getPlannedOutfitForDate(dateStr);
        setPlannedOutfit(result);

        if (result.image && (result.image.status === 'pending' || result.image.status === 'generating')) {
          startPolling(result.image.id, dateStr);
        }
      } catch (e) {
        console.error('[PlannerView] Failed to load date data:', e);
      } finally {
        setIsLoading(false);
      }
    },
    [formatDateStr, startPolling],
  );

  const loadMonthData = useCallback(async (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    try {
      const planned = await getPlannedOutfitsForRange(start, end);
      const dateSet = new Set<string>();
      const statusMap = new Map<string, 'pending' | 'generating' | 'completed' | 'failed'>();
      planned.forEach((p) => {
        if (p.date) dateSet.add(p.date);
        if (p.status) statusMap.set(p.date, p.status);
      });
      setPlannedDates(dateSet);
      setGenerationStatuses(statusMap);
    } catch (e) {
      console.error('[PlannerView] Failed to load month data:', e);
    }
  }, []);

  useEffect(() => {
    loadDateData(selectedDate);
    loadMonthData(selectedDate);
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [selectedDate, loadDateData, loadMonthData]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────
  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const handlePlanOutfit = useCallback(() => {
    // If user hasn't uploaded a base photo, prompt them first
    if (hasBasePhoto === false) {
      setShowPhotoUpload(true);
      return;
    }
    if (outfits.length === 0) {
      navigate('/canvas');
      return;
    }
    setShowOutfitPicker(true);
  }, [hasBasePhoto, outfits.length, navigate]);

  const handleSelectOutfit = useCallback(
    async (outfit: SavedOutfit) => {
      setShowOutfitPicker(false);
      setIsLoading(true);
      try {
        await planOutfitForDate(outfit, selectedDate);
        await loadDateData(selectedDate);
        await loadMonthData(selectedDate);
      } catch (e) {
        console.error('[PlannerView] Failed to plan outfit:', e);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedDate, loadDateData, loadMonthData],
  );

  const handleRemoveOutfit = useCallback(async () => {
    const dateStr = formatDateStr(selectedDate);
    setIsLoading(true);
    try {
      await unplanDate(dateStr);
      setPlannedOutfit({ planner: null, image: null });
      await loadMonthData(selectedDate);
    } catch (e) {
      console.error('[PlannerView] Failed to remove outfit:', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, formatDateStr, loadMonthData]);

  const handleToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  // ── Derived state ──────────────────────────────────────────────
  const currentGenStatus = useMemo(() => {
    if (!plannedOutfit.image) return null;
    return plannedOutfit.image.status as 'idle' | 'pending' | 'generating' | 'completed' | 'failed';
  }, [plannedOutfit.image]);

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col bg-background">
      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 pt-2 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2} />
          </button>
          <h1 className="text-xl font-semibold tracking-tight">Planner</h1>
        </div>
        <button
          type="button"
          onClick={handleToday}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-semibold transition-all',
            formatDateStr(selectedDate) === formatDateStr(new Date())
              ? 'bg-foreground text-background'
              : 'bg-muted text-foreground hover:bg-muted/80',
          )}
        >
          Today
        </button>
      </header>

      {/* ── Day/Month Tab Switcher ─────────────────────────────── */}
      <div className="px-5 pb-2">
        <div className="inline-flex rounded-full bg-muted p-1">
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={cn(
              'rounded-full px-5 py-1.5 text-sm font-medium transition-all',
              viewMode === 'day' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            Day
          </button>
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={cn(
              'rounded-full px-5 py-1.5 text-sm font-medium transition-all',
              viewMode === 'month' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            Month
          </button>
        </div>
      </div>

      {/* ── Week Strip ─────────────────────────────────────────── */}
      {viewMode === 'day' && (
        <WeekStrip
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          plannedDates={plannedDates}
          generationStatuses={generationStatuses}
        />
      )}

      <div className="mx-5 h-px bg-border/60" />

      {/* ── Content ────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {viewMode === 'day' ? (
          <motion.div
            key="day-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col"
          >
            <DayView
              date={selectedDate}
              tryOnImageUrl={plannedOutfit.image?.image_url ?? null}
              generationStatus={currentGenStatus}
              outfitName={plannedOutfit.planner?.outfit_data?.name ?? undefined}
              hasOutfits={outfits.length > 0}
              onPlanOutfit={handlePlanOutfit}
              onChangeOutfit={handlePlanOutfit}
              onRemoveOutfit={handleRemoveOutfit}
              errorMessage={plannedOutfit.image?.error_message}
              hasBasePhoto={hasBasePhoto}
              onUploadPhoto={() => {
                setShowPhotoUpload(true);
                fileInputRef.current?.click();
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="month-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col pt-3"
          >
            <MonthView
              displayMonth={selectedDate}
              selectedDate={selectedDate}
              plannedDates={plannedDates}
              generationStatuses={generationStatuses}
              onSelectDate={handleSelectDate}
            />
            <div className="mx-5 h-px bg-border/60 mb-3" />
            <DayView
              date={selectedDate}
              tryOnImageUrl={plannedOutfit.image?.image_url ?? null}
              generationStatus={currentGenStatus}
              outfitName={plannedOutfit.planner?.outfit_data?.name ?? undefined}
              hasOutfits={outfits.length > 0}
              onPlanOutfit={handlePlanOutfit}
              onChangeOutfit={handlePlanOutfit}
              onRemoveOutfit={handleRemoveOutfit}
              errorMessage={plannedOutfit.image?.error_message}
              hasBasePhoto={hasBasePhoto}
              onUploadPhoto={() => {
                setShowPhotoUpload(true);
                fileInputRef.current?.click();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Photo Upload Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {showPhotoUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6"
            onClick={() => setShowPhotoUpload(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-3xl p-8 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Camera className="h-9 w-9 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-semibold mb-2">Upload Your Photo</h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Take or upload a full-body photo so the AI can generate realistic try-on images of you wearing your planned outfits.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    // Re-trigger file input with camera
                    if (fileInputRef.current) {
                      fileInputRef.current.capture = 'environment';
                      fileInputRef.current.click();
                    }
                  }}
                  disabled={uploadingPhoto}
                  className="w-full rounded-full bg-foreground py-3.5 text-sm font-semibold text-background hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploadingPhoto ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4" />
                      Take a Photo
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('capture');
                      fileInputRef.current.click();
                    }
                  }}
                  disabled={uploadingPhoto}
                  className="w-full rounded-full bg-muted py-3.5 text-sm font-semibold text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ImageIcon className="h-4 w-4" />
                  Choose from Gallery
                </button>
                <button
                  type="button"
                  onClick={() => setShowPhotoUpload(false)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors pt-2"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Outfit Picker Modal ────────────────────────────────── */}
      <AnimatePresence>
        {showOutfitPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowOutfitPicker(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
              className="w-full max-w-lg bg-white rounded-t-[28px] max-h-[70vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
              style={{ paddingBottom: `calc(16px + env(safe-area-inset-bottom, 0px))` }}
            >
              <div className="mx-auto mt-2 mb-2 h-1.5 w-10 rounded-full bg-gray-200" />
              <div className="flex items-center justify-between px-6 pb-3 pt-1">
                <h2 className="text-lg font-semibold">Pick an Outfit</h2>
                <button
                  type="button"
                  onClick={() => setShowOutfitPicker(false)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="space-y-2">
                  {outfits.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      No saved outfits yet. Create one in Canvas first.
                    </p>
                  ) : (
                    outfits.map((outfit) => (
                      <button
                        key={outfit.id}
                        type="button"
                        onClick={() => handleSelectOutfit(outfit)}
                        className="flex w-full items-center gap-3 rounded-2xl bg-muted/30 p-4 text-left hover:bg-muted/60 transition-colors active:scale-[0.98]"
                      >
                        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
                          {outfit.thumbnail_url ? (
                            <img
                              src={outfit.thumbnail_url}
                              alt={outfit.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <span className="text-xs text-muted-foreground">
                                {outfit.items.length} items
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {outfit.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {outfit.items.length} pieces
                            {outfit.score ? ` · ${outfit.score} pts` : ''}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
