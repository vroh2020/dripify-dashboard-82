/**
 * FitsView — top-level route for the Fits tab.
 *
 * URL map:
 *  /fits            → saved-fits collage grid (was: ClosetView > CollectionsTab)
 *  /fits/builder    → outfit builder (was: ClosetView > FitsTab)
 *  /fits/:id        → saved-fit detail (read-only inspection + delete)
 *
 * Route dispatch is intentionally a plain `pathname` parse rather than a
 * nested <Routes> setup — `Index.tsx` owns the top-tab routing and we want
 * one consistent place to read the URL inside the app shell.
 *
 * Uses `useClosetData` for items + outfits + save/delete so the Closet and
 * Fits tabs share one source of truth and stay in sync without a full
 * refetch when the builder saves a new fit.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  Plus,
  Shuffle,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';

import {
  type ClosetItem,
  type SavedOutfit,
  useClosetData,
} from '@/hooks/useClosetData';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

/* -------------------------------------------------------------------------- */
/*                                Sub-components                              */
/* -------------------------------------------------------------------------- */

/**
 * Hero header every subroute shares.
 * Padding-top respects safe-area-inset so iOS notch / Dynamic Island users
 * never lose the title to the rounded corners.
 */
function FitsHeader({
  eyebrow,
  title,
  rightAction,
}: {
  eyebrow: string;
  title: string;
  rightAction?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="pt-2"
      style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 0.75rem)` }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
          {eyebrow}
        </p>
        {rightAction}
      </div>
      <h1 className="text-[34px] font-bold text-black tracking-tight leading-tight">
        {title}
      </h1>
    </motion.div>
  );
}

/**
 * Hero collage for the saved-fits grid. Renders up to 4 item thumbnails in
 * a 2x2 mosaic, with a centered "+N" badge when there's overflow, plus a
 * gradient scrim at the bottom carrying the fit name + date.
 *
 * Inspired by the Whering / Pinterest fashion-thumb pattern: full-bleed,
 * gradient, name overlay. Less metadata-on-card = cleaner grid.
 */
function FitCardCollage({ outfit }: { outfit: SavedOutfit }) {
  const thumbs = outfit.items.slice(0, 4);
  // Hydrated `items` is the source of truth for both sides of the math.
  // `item_ids` can reference pieces deleted from the closet since the
  // fit was saved; trusting it would over-count the `+N` badge.
  const overflow = Math.max(outfit.items.length - thumbs.length, 0);

  return (
    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 group">
      {/* Mosaic background */}
      {thumbs.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
          Empty fit
        </div>
      ) : thumbs.length === 1 ? (
        <img
          src={thumbs[0]?.source_image_url ?? ''}
          alt={outfit.name}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className={`absolute inset-0 grid gap-px ${
            thumbs.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'
          }`}
        >
          {thumbs.map((item, i) => (
            <div key={item.id ?? i} className="bg-white overflow-hidden">
              {item.source_image_url ? (
                <img
                  src={item.source_image_url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">
                  ✦
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* "+N" overlay when there are more items than shown */}
      {overflow > 0 && (
        <div className="absolute top-2 right-2 bg-black/85 text-white text-[11px] font-bold px-2 py-1 rounded-full backdrop-blur-md">
          +{overflow}
        </div>
      )}

      {/* Bottom scrim with name + count */}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
        <p className="text-white text-sm font-bold line-clamp-1">
          {outfit.name}
        </p>
        <p className="text-white/70 text-[11px] font-medium mt-0.5">
          {outfit.items.length}{' '}
          {outfit.items.length === 1 ? 'piece' : 'pieces'}
          {outfit.created_at &&
            ` · ${new Date(outfit.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}`}
        </p>
      </div>
    </div>
  );
}

/**
 * Saved-fits grid view. Two-column mosaic; tap to open detail.
 * Empty state targets the "first fit" moment with a CTA into the builder.
 */
function SavedFitsGrid() {
  const navigate = useNavigate();
  const { outfits, isInitialLoad, loadError, retry } = useClosetData();

  if (isInitialLoad) {
    return (
      <div className="space-y-5 pt-2" aria-busy="true" aria-live="polite">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] rounded-2xl bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mt-12 text-center">
        <p className="text-base font-semibold text-gray-900">
          Couldn't load your fits
        </p>
        <p className="text-sm text-gray-500 mt-1">{loadError}</p>
        <Button onClick={retry} className="mt-4">
          Try again
        </Button>
      </div>
    );
  }

  if (outfits.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-6 flex flex-col items-center text-center px-4 py-10"
      >
        {/* Eyebrow visual — empty fit bag illustration */}
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
          <Sparkles className="w-9 h-9 text-gray-400" strokeWidth={1.5} />
        </div>
        <p className="text-xl font-bold text-gray-900 tracking-tight">
          No saved fits yet
        </p>
        <p className="text-sm text-gray-500 mt-1.5 max-w-[260px]">
          Build your first outfit — we'll keep it here so you can re-wear it any
          day.
        </p>
        <Button
          onClick={() => navigate('/fits/builder')}
          className="mt-6 bg-black text-white rounded-2xl px-6 py-3 hover:bg-gray-900"
        >
          <Wand2 className="w-4 h-4 mr-2" strokeWidth={2} />
          Build my first fit
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 pt-2">
      {outfits.map((outfit, idx) => (
        <motion.button
          key={outfit.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(idx * 0.04, 0.4), duration: 0.3 }}
          onClick={() => navigate(`/fits/${outfit.id}`)}
          className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 rounded-2xl active:scale-[0.98] transition-transform"
          aria-label={`Open fit ${outfit.name}`}
        >
          <FitCardCollage outfit={outfit} />
        </motion.button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Fit builder (state)                           */
/* -------------------------------------------------------------------------- */

interface FitState {
  headwear: ClosetItem | null;
  tops: ClosetItem | null;
  bottoms: ClosetItem | null;
  footwear: ClosetItem | null;
}

const EMPTY_FIT: FitState = {
  headwear: null,
  tops: null,
  bottoms: null,
  footwear: null,
};

/**
 * Categorize the wardrobe into the four slots the builder cares about.
 * Headwear is a heuristic — anything flagged `accessories` whose title
 * mentions hat / cap / beanie. Keep this aligned with the FitsTab logic
 * that used to live in ClosetView so a saved fit keeps the same items.
 */
function useCategorizedItems(items: ClosetItem[]) {
  return useMemo(() => {
    const isHeadwear = (i: ClosetItem) => {
      const t = i.title?.toLowerCase() ?? '';
      return (
        i.category === 'accessories' &&
        (t.includes('hat') || t.includes('cap') || t.includes('beanie'))
      );
    };
    return {
      headwear: items.filter(isHeadwear),
      tops: items.filter((i) => i.category === 'tops'),
      bottoms: items.filter((i) => i.category === 'bottoms'),
      footwear: items.filter((i) => i.category === 'shoes'),
    };
  }, [items]);
}

/**
 * Stable PRNG-style picker so we don't pick the same item twice in a row
 * when the category has at least 2 pieces. `Math.random()` feels right but
 * adjacent picks can collide; this guarantees a different item if any
 * other exists.
 */
function pickDifferent(
  pool: ClosetItem[],
  currentId: string | null
): ClosetItem | null {
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];
  const filtered = currentId ? pool.filter((i) => i.id !== currentId) : pool;
  const idx = Math.floor(Math.random() * filtered.length);
  return filtered[idx];
}

/**
 * Unified shuffle: pick a fresh item per slot. Headwear is optional —
 * leave it null if the wardrobe doesn't have one.
 */
function generateFromWardrobe(
  cats: ReturnType<typeof useCategorizedItems>
): FitState {
  const headwear =
    cats.headwear.length > 0
      ? cats.headwear[Math.floor(Math.random() * cats.headwear.length)]
      : null;
  const tops = cats.tops.length > 0
    ? pickDifferent(cats.tops, null)
    : null;
  const bottoms = cats.bottoms.length > 0
    ? pickDifferent(cats.bottoms, null)
    : null;
  const footwear = cats.footwear.length > 0
    ? pickDifferent(cats.footwear, null)
    : null;
  return { headwear, tops, bottoms, footwear };
}

/* -------------------------------------------------------------------------- */
/*                             FitBuilder subroute                            */
/* -------------------------------------------------------------------------- */

function FitBuilder() {
  const { items, saveOutfit } = useClosetData();
  const cats = useCategorizedItems(items);
  const [currentFit, setCurrentFit] = useState<FitState>(EMPTY_FIT);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [fitName, setFitName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Initialize the fit exactly once when items first arrive — moves what
  // used to be a `queueMicrotask` setState-during-render into an effect,
  // which removes the React 18 "cannot update component while rendering
  // a different component" warning. The `cats` dep is safe because the
  // `hasInitialized` guard short-circuits once the first fit is set.
  useEffect(() => {
    if (!hasInitialized && items.length > 0) {
      setCurrentFit(generateFromWardrobe(cats));
      setHasInitialized(true);
    }
  }, [cats, hasInitialized, items.length]);

  const shuffleCategory = (slot: keyof FitState) => {
    const pool =
      slot === 'headwear'
        ? cats.headwear
        : slot === 'tops'
        ? cats.tops
        : slot === 'bottoms'
        ? cats.bottoms
        : cats.footwear;
    setCurrentFit((prev) => ({
      ...prev,
      [slot]: pickDifferent(pool, prev[slot]?.id ?? null),
    }));
  };

  const shuffleAll = () => {
    setCurrentFit(generateFromWardrobe(cats));
  };

  const handleSave = async () => {
    if (!fitName.trim()) return;
    setIsSaving(true);
    const fitItems: Array<ClosetItem | null> = [
      currentFit.headwear,
      currentFit.tops,
      currentFit.bottoms,
      currentFit.footwear,
    ];
    const saved = await saveOutfit({ name: fitName.trim(), items: fitItems });
    setIsSaving(false);
    if (saved) {
      toast({
        title: 'Fit saved',
        description: `Saved "${saved.name}" to your fits`,
      });
      setShowNameModal(false);
      setFitName('');
    } else {
      toast({
        title: "Couldn't save",
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const hasAnyItems = items.length > 0;
  const populatedSlots = (
    Object.values(currentFit).filter(Boolean) as ClosetItem[]
  ).length;

  return (
    <>
      <div className="flex items-center justify-center gap-2 pt-4 pb-2">
        <button
          onClick={shuffleAll}
          disabled={!hasAnyItems}
          className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Shuffle className="w-3.5 h-3.5" strokeWidth={2.5} />
          Shuffle All
        </button>
        <button
          onClick={() => setShowNameModal(true)}
          disabled={!hasAnyItems || populatedSlots === 0}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-900 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Bookmark className="w-3.5 h-3.5" strokeWidth={2.5} />
          Save Fit
        </button>
      </div>

      {!hasAnyItems ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 flex flex-col items-center text-center px-4"
        >
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Sparkles className="w-9 h-9 text-gray-400" strokeWidth={1.5} />
          </div>
          <p className="text-xl font-bold text-gray-900 tracking-tight">
            Add pieces to your closet first
          </p>
          <p className="text-sm text-gray-500 mt-1.5 max-w-[260px]">
            Once you have at least a top and a bottom, we can start mixing fits
            here.
          </p>
          <Link to="/closet">
            <Button className="mt-6 bg-black text-white rounded-2xl px-6 py-3 hover:bg-gray-900">
              <Plus className="w-4 h-4 mr-2" strokeWidth={2.5} />
              Open Closet
            </Button>
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-3 pt-2">
          {(
            ['headwear', 'tops', 'bottoms', 'footwear'] as const
          ).map((slot, idx) => {
            const item = currentFit[slot];
            return (
              <motion.button
                key={slot}
                onClick={() => shuffleCategory(slot)}
                disabled={cats[slot].length === 0}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`Shuffle ${slot}`}
              >
                <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {item?.source_image_url ? (
                    <img
                      src={item.source_image_url}
                      alt={item.title}
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          'none';
                      }}
                    />
                  ) : (
                    <div className="text-gray-300 text-2xl">
                      {slot === 'headwear'
                        ? '🎩'
                        : slot === 'tops'
                        ? '👕'
                        : slot === 'bottoms'
                        ? '👖'
                        : '👟'}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    {slot}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">
                    {item
                      ? item.title
                      : cats[slot].length === 0
                      ? `Add a ${slot} item to your closet`
                      : 'Tap to add'}
                  </p>
                </div>
                <Shuffle
                  className="w-4 h-4 text-gray-400"
                  strokeWidth={2}
                />
              </motion.button>
            );
          })}
          <p className="text-[11px] text-gray-400 text-center pt-2">
            Tap any slot to shuffle. Tap "Shuffle All" to remix from scratch.
          </p>
        </div>
      )}

      {/* Save name modal */}
      <AnimatePresence>
        {showNameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowNameModal(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Save fit name"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl"
            >
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Bookmark
                    className="w-6 h-6 text-gray-900"
                    strokeWidth={2}
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                  Name this fit
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  So you can find it later
                </p>
              </div>
              <input
                autoFocus
                value={fitName}
                onChange={(e) => setFitName(e.target.value)}
                placeholder="e.g., Casual Friday"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-black focus:outline-none transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && fitName.trim()) {
                    handleSave();
                  }
                }}
              />
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setShowNameModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!fitName.trim() || isSaving}
                  className="flex-1 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Saved fit detail                              */
/* -------------------------------------------------------------------------- */

function FitDetail() {
  const { id } = useParams<{ id: string }>();
  const { outfits, deleteOutfit } = useClosetData();
  const outfit = outfits.find((o) => o.id === id);
  const { toast } = useToast();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!outfit) {
    return (
      <div className="mt-12 text-center">
        <p className="text-base font-semibold text-gray-900">
          Fit not found
        </p>
        <p className="text-sm text-gray-500 mt-1">
          It may have been deleted from another device.
        </p>
        <Link to="/fits">
          <Button className="mt-5">Back to fits</Button>
        </Link>
      </div>
    );
  }

  const handleDelete = async () => {
    await deleteOutfit(outfit.id);
    toast({
      title: 'Fit deleted',
      description: `"${outfit.name}" was removed.`,
    });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Link
          to="/fits"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          aria-label="Back to fits"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <button
          onClick={() => setConfirmingDelete(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          aria-label="Delete fit"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
      <h2 className="text-[28px] font-bold text-gray-900 tracking-tight leading-tight">
        {outfit.name}
      </h2>
      {outfit.created_at && (
        <p className="text-xs text-gray-500 mt-1 mb-5 font-medium">
          Saved{' '}
          {new Date(outfit.created_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      )}

      <div className="space-y-6 mt-6">
        {outfit.items.map((item, idx) => (
          <motion.div
            key={item.id ?? idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white border border-gray-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm"
          >
            <div className="w-14 h-14 rounded-xl bg-gray-50 overflow-hidden flex items-center justify-center flex-shrink-0">
              {item.source_image_url ? (
                <img
                  src={item.source_image_url}
                  alt={item.title}
                  className="w-full h-full object-contain p-1"
                  loading="lazy"
                />
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                {item.category}
              </p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">
                {item.title}
              </p>
              {item.brand && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {item.brand}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {confirmingDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setConfirmingDelete(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm delete"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                Delete this fit?
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                "{outfit.name}" will be removed from your saved fits. The
                pieces in your closet stay.
              </p>
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                                FitsView router                             */
/* -------------------------------------------------------------------------- */

export function FitsView() {
  const location = useLocation();
  // Parse path segments so nested URLs route correctly without a full
  // react-router v6 nested-routes setup (the parent `Index.tsx` already
  // owns the top-level switch). Explicit dispatch guards type-safety
  // against arbitrary strings like `/fits/<uuid>` being silently
  // truncated to `'detail'` (TypeScript would otherwise trust the cast).
  const segments = location.pathname.split('/').filter(Boolean);
  const subroute: 'grid' | 'builder' | 'detail' = (() => {
    if (segments.length === 1) return 'grid';
    if (segments[1] === 'builder') return 'builder';
    return 'detail';
  })();

  // Builder entrypoint — anchored above the tab bar so the thumb can reach
  // it without thumb gymnastics. The header is preserved on detail; the
  // builder has its own inline controls instead.
  if (subroute === 'builder') {
    return (
      <div className="px-4 pb-nav-fab min-h-full">
        <FitsHeader eyebrow="Fit Builder" title="Today's outfit" />
        <FitBuilder />
      </div>
    );
  }

  if (subroute === 'detail') {
    return (
      <div className="px-4 pb-nav-fab min-h-full">
        <FitDetail />
      </div>
    );
  }

  // Grid view: tap-to-open detail + FAB to jump into builder.
  return (
    <div className="px-4 pb-nav-fab min-h-full relative">
      <FitsHeader
        eyebrow="Your Fits"
        title="Saved outfits"
        rightAction={
          outfits.length > 0 ? (
            <Link to="/fits/builder">
              <button
                aria-label="Create new fit"
                className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              >
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </Link>
          ) : undefined
        }
      />
      <SavedFitsGrid />
      {/* Floating action — only on the grid view, never double-up with the
          header right-action. */}
      {outfits.length > 0 ? (
        <Link
          to="/fits/builder"
          className="fixed right-5 w-14 h-14 bg-black rounded-full flex items-center justify-center shadow-lg hover:bg-gray-900 z-40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          style={{
            bottom:
              'calc(64px + env(safe-area-inset-bottom, 0px) + 20px)',
          }}
          aria-label="Build new fit"
        >
          <Wand2 className="w-6 h-6 text-white" strokeWidth={2.25} />
        </Link>
      ) : null}
    </div>
  );
}
