"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { Shuffle, Bookmark, Check } from "lucide-react"
import { NamePrompt } from "@/components/whering/NamePrompt"
import { haptic } from "@/lib/haptics"
import { cn } from "@/lib/utils"
import type { ClosetItem, SavedOutfit } from "@/hooks/useClosetData"
import { FEMALE_DEMO_ITEMS } from "@/lib/demo-wardrobe"

// ─── Internal display item (bridges ClosetItem to the ShufflerRow's contract) ───

interface ShufflerDisplayItem {
  id: string
  name: string
  src: string
  closetItem?: ClosetItem
}

function mapClosetToDisplay(items: ClosetItem[], category: string): ShufflerDisplayItem[] {
  return items
    .filter((i) => i.category === category && i.source_image_url)
    .map((i) => ({
      id: i.id,
      name: i.title,
      src: i.source_image_url!,
      closetItem: i,
    }))
}

function mapDemoToDisplay(items: ClosetItem[]): ShufflerDisplayItem[] {
  return items.map((ci) => ({
    id: ci.id,
    name: ci.title,
    src: ci.source_image_url ?? "/placeholder.svg",
    closetItem: ci,
  }))
}

// ─── ShufflerRow (unchanged contract, works with ShufflerDisplayItem) ───

function ShufflerRow({
  items,
  heightClass,
  onIndexChange,
  registerScroller,
}: {
  items: ShufflerDisplayItem[]
  heightClass: string
  onIndexChange: (index: number) => void
  registerScroller: (fn: (index: number) => void) => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  // Wrap-around carousel state.
  // - `activeRealIdx` tracks the user-facing item index (0..items.length-1)
  //   regardless of where it sits in the cloned renderItems array.
  // - `lastRenderedIdx` tracks where in the cloned list we're currently
  //   resting so the scrollend jump knows which clone to correct.
  // - `scrollTimeout` debounces a `scroll` listener into a reliable
  //   `scrollend` polyfill (Safari iOS 15/16 don't ship the native event).
  const activeRealIdx = useRef(-1)
  const lastRenderedIdx = useRef(0)
  const scrollTimeout = useRef<NodeJS.Timeout>()

  // Clone first and last items at the boundaries so swiping past either
  // end lands on a clone, then silently snaps back to the real item.
  // Disabled for 0/1-item rows because wrap-around would feel jittery
  // when there's nothing to scroll to anyway.
  const hasClones = items.length > 1
  const renderItems = useMemo(
    () =>
      hasClones
        ? [items[items.length - 1], ...items, items[0]]
        : items,
    [items, hasClones],
  )

  // Map a `renderItems` index back to the user-facing item index. The
  // clones at the ends are 0 and (renderItems.length-1), and they
  // represent the *real* first and last items respectively.
  const getRealIndex = useCallback(
    (renderIdx: number): number => {
      if (!hasClones) return renderIdx
      if (renderIdx === 0) return items.length - 1
      if (renderIdx === renderItems.length - 1) return 0
      return renderIdx - 1
    },
    [hasClones, items.length, renderItems.length],
  )

  // Imperative scrollTo used by the parent's Shuffle button. Translate
  // the parent's domain index (0..items.length-1) into the renderItems
  // index space (+1 to skip the leading clone).
  useEffect(() => {
    registerScroller((index: number) => {
      const safeIdx = Math.max(0, Math.min(index, items.length - 1))
      const renderIdx = hasClones ? safeIdx + 1 : safeIdx
      const el = itemRefs.current[renderIdx]
      if (el && rowRef.current) {
        rowRef.current.scrollTo({ left: el.offsetLeft, behavior: "smooth" })
      }
    })
  }, [registerScroller, hasClones, items.length])

  // IntersectionObserver — read the focus state, but emit the *real*
  // index so the parent never sees a clone. Storing `lastRenderedIdx`
  // here lets the scroll-jump useEffect below know where we landed.
  useEffect(() => {
    const root = rowRef.current
    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.6) continue
          const index = itemRefs.current.findIndex(
            (el) => el === entry.target,
          )
          if (index === -1) continue
          lastRenderedIdx.current = index
          const realIdx = getRealIndex(index)
          if (realIdx !== activeRealIdx.current) {
            activeRealIdx.current = realIdx
            haptic("light")
            onIndexChange(realIdx)
          }
        }
      },
      { root, threshold: [0.6] },
    )

    itemRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [onIndexChange, getRealIndex, renderItems])

  // Wrap jump — when the user finishes a flick and lands on a clone
  // (renderIdx 0 or last), silently scroll back to the matching real
  // item without animation. 150ms is the standard scrollend fallback
  // window for `scroll` event silence on iOS WebView.
  useEffect(() => {
    const root = rowRef.current
    if (!root) return
    const onScroll = () => {
      window.clearTimeout(scrollTimeout.current)
      scrollTimeout.current = window.setTimeout(() => {
        if (!hasClones) return
        const currentRenderIdx = lastRenderedIdx.current
        if (
          currentRenderIdx === 0 ||
          currentRenderIdx === renderItems.length - 1
        ) {
          const targetRenderIdx = getRealIndex(currentRenderIdx) + 1
          const targetEl = itemRefs.current[targetRenderIdx]
          if (targetEl) {
            root.scrollTo({ left: targetEl.offsetLeft, behavior: "auto" })
          }
        }
      }, 150)
    }
    root.addEventListener("scroll", onScroll, { passive: true } as AddEventListenerOptions)
    return () => {
      root.removeEventListener("scroll", onScroll)
      window.clearTimeout(scrollTimeout.current)
    }
  }, [hasClones, getRealIndex, renderItems.length])

  // Initial centering — skip ahead past the leading clone so the user
  // starts on the real first item, never on a clone.
  useEffect(() => {
    if (!hasClones) return
    const target = itemRefs.current[1]
    if (target && rowRef.current) {
      rowRef.current.scrollTo({ left: target.offsetLeft, behavior: "auto" })
    }
  }, [hasClones])

  return (
    <div
      ref={rowRef}
      className={cn(
        "no-scrollbar snap-x-center flex w-full overflow-x-scroll",
        heightClass,
      )}
    >
      {renderItems.map((item, i) => (
        <div
          key={`${item.id}-${i}`}
          ref={(el) => {
            itemRefs.current[i] = el
          }}
          className="snap-item flex w-full flex-none items-center justify-center px-6"
        >
          <div className="relative h-full w-full max-w-[280px]">
            <Image
              src={item.src || "/placeholder.svg"}
              alt={item.name}
              fill
              sizes="280px"
              className="object-contain"
              priority={i === 0 || i === 1}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Shuffler ───

export function Shuffler({
  closetItems,
  demoItems = FEMALE_DEMO_ITEMS,
  onSaveOutfit,
  onSaved,
}: {
  closetItems: ClosetItem[]
  demoItems?: ClosetItem[]
  onSaveOutfit: (name: string, items: ClosetItem[], metadata?: Record<string, any>, thumbnail?: string) => Promise<SavedOutfit | null>
  onSaved?: () => void
}) {
  const [indices, setIndices] = useState({ top: 0, bottom: 0, shoe: 0 })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showNamePrompt, setShowNamePrompt] = useState(false)

  const scrollers = useRef<{
    top?: (i: number) => void
    bottom?: (i: number) => void
    shoe?: (i: number) => void
  }>({})

  // Track when each row's scroller is registered so we can auto-shuffle
  const readyCount = useRef(0)
  const didInitialShuffle = useRef(false)
  const registerWithCount = (key: 'top' | 'bottom' | 'shoe') => (fn: (index: number) => void) => {
    scrollers.current[key] = fn
    readyCount.current += 1
    // Once all 3 rows have registered their scrollers, auto-shuffle silently
    if (readyCount.current >= 3 && !didInitialShuffle.current) {
      didInitialShuffle.current = true
      // Use a microtask so the scroll DOM write lands before we read .length
      Promise.resolve().then(() => shuffleAll(true))
    }
  }

  // Build per-category items: real closet items first, fall back to hardcoded
  const topsDisplay = useMemo(() => {
    const real = mapClosetToDisplay(closetItems, "tops");
    return real.length > 0 ? real : mapDemoToDisplay(demoItems.filter(d => d.category === "tops" || d.category === "outerwear"));
  }, [closetItems, demoItems]);
  const bottomsDisplay = useMemo(() => {
    const real = mapClosetToDisplay(closetItems, "bottoms");
    return real.length > 0 ? real : mapDemoToDisplay(demoItems.filter(d => d.category === "bottoms"));
  }, [closetItems, demoItems]);
  const shoesDisplay = useMemo(() => {
    const real = mapClosetToDisplay(closetItems, "shoes");
    return real.length > 0 ? real : mapDemoToDisplay(demoItems.filter(d => d.category === "shoes"));
  }, [closetItems, demoItems]);

  const setTop    = useCallback((i: number) => { setIndices((p) => ({ ...p, top: i })); setSaved(false) }, [])
  const setBottom = useCallback((i: number) => { setIndices((p) => ({ ...p, bottom: i })); setSaved(false) }, [])
  const setShoe   = useCallback((i: number) => { setIndices((p) => ({ ...p, shoe: i })); setSaved(false) }, [])

  const shuffleAll = (silent = false) => {
    if (!silent) haptic("medium")
    setSaved(false)
    scrollers.current.top?.(Math.floor(Math.random() * topsDisplay.length))
    scrollers.current.bottom?.(Math.floor(Math.random() * bottomsDisplay.length))
    scrollers.current.shoe?.(Math.floor(Math.random() * shoesDisplay.length))
  }

  const handleSaveClick = () => {
    haptic("medium")
    setShowNamePrompt(true)
  }

  const handleConfirmSave = async (name: string) => {
    console.log('👗 [Shuffler] Save initiated — name:', name)
    setShowNamePrompt(false)
    setSaving(true)

    const selected: (ClosetItem | null)[] = [
      topsDisplay[indices.top]?.closetItem ?? null,
      bottomsDisplay[indices.bottom]?.closetItem ?? null,
      shoesDisplay[indices.shoe]?.closetItem ?? null,
    ]
    const validItems = selected.filter((i): i is ClosetItem => i !== null)
    console.log('👗 [Shuffler] Valid items:', validItems.length, validItems.map(i => ({ id: i.id, title: i.title })))

    if (validItems.length === 0) {
      console.warn('👗 [Shuffler] No items to save')
      setSaving(false)
      return
    }

    // Save portrait layout positions so edit mode reconstructs the exact Shuffler look
    const positions = validItems.map((item, i) => {
      const y = item.category === "shoes" ? 200
              : item.category === "bottoms" ? 70
              : -90 // tops / outerwear
      return {
        item_id: item.id,
        x: 0,
        y,
        scale: item.category === "shoes" ? 0.7 : 1,
        rotation: 0,
        z: i + 1,
      }
    })
    const metadata = { source: "shuffler", positions }

    haptic("medium")

    console.log('👗 [Shuffler] Calling onSaveOutfit...')
    try {
      const result = await onSaveOutfit(name, validItems, metadata)
      console.log('👗 [Shuffler] onSaveOutfit result:', result ? `Saved! id=${result.id}` : 'FAILED — returned null')
      if (result) {
        setSaved(true)
        haptic("medium")
        console.log('👗 [Shuffler] Navigating to /fits...')
        onSaved?.()
      } else {
        console.error('👗 [Shuffler] Save returned null — check Supabase logs')
      }
    } catch (err) {
      console.error('👗 [Shuffler] Save threw exception:', err)
    }
    setSaving(false)
  }

  return (
    <div className="flex h-full flex-col relative">
      {/* Name prompt overlay */}
      {showNamePrompt && (
        <NamePrompt
          onConfirm={handleConfirmSave}
          onCancel={() => setShowNamePrompt(false)}
        />
      )}

      <header className="flex items-center justify-between px-5 pb-3 pt-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Dress Me
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {"Today's Shuffle"}
          </h1>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-[4]">
          <ShufflerRow
            items={topsDisplay}
            heightClass="h-full"
            onIndexChange={setTop}
            registerScroller={registerWithCount('top')}
          />
        </div>
        <div className="flex-[4]">
          <ShufflerRow
            items={bottomsDisplay}
            heightClass="h-full"
            onIndexChange={setBottom}
            registerScroller={registerWithCount('bottom')}
          />
        </div>
        <div className="flex-[3]">
          <ShufflerRow
            items={shoesDisplay}
            heightClass="h-full"
            onIndexChange={setShoe}
            registerScroller={registerWithCount('shoe')}
          />
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 px-5 pb-2 pt-3">
        <button
          type="button"
          onClick={handleSaveClick}
          disabled={saving}
          className={cn(
            "flex h-13 flex-1 items-center justify-center gap-2 rounded-full border text-sm font-semibold transition-colors",
            saved
              ? "border-transparent bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground",
          )}
          style={{ height: 52 }}
        >
          {saved ? <Check className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
          {saving ? "Saving..." : saved ? "Saved" : "Save Look"}
        </button>
        <button
          type="button"
          onClick={() => shuffleAll()}
          className="flex items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-semibold text-background lift-shadow"
          style={{ height: 52 }}
        >
          <Shuffle className="h-5 w-5" />
          Shuffle
        </button>
      </div>
    </div>
  )
}
