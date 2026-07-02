"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { Shuffle, Bookmark, Check, ChevronLeft, ChevronRight } from "lucide-react"
import { useDrag } from "@use-gesture/react"
import { motion, AnimatePresence } from "framer-motion"
import { NamePrompt } from "@/components/whering/NamePrompt"
import { haptic } from "@/lib/haptics"
import { cn } from "@/lib/utils"
import type { ClosetItem, SavedOutfit } from "@/hooks/useClosetData"
import { FEMALE_DEMO_ITEMS } from "@/lib/demo-wardrobe"

// ─── Swipeable Canvas Item ───

function SwipeableItem({
  items,
  index,
  onIndexChange,
  className,
  heightPercent,
  zIndex,
}: {
  items: { id: string; name: string; src: string; closetItem?: ClosetItem }[]
  index: number
  onIndexChange: (idx: number) => void
  className: string
  heightPercent: number
  zIndex: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const firedRef = useRef(false)
  const item = items[index]
  const canSwipe = items.length > 1

  const bind = useDrag(
    ({ first, movement: [mx], last, cancel }) => {
      if (!canSwipe) return
      // Imperative DOM manipulation — same pattern as canvas.tsx DraggableItem.
      // Avoids React re-render overhead and guarantees snap-back on partial drags.
      if (ref.current) {
        ref.current.style.transform = `translateX(calc(-50% + ${mx}px))`
      }
      if (last) {
        if (Math.abs(mx) > 60 && !firedRef.current) {
          firedRef.current = true
          haptic("light")
          const dir = mx > 0 ? -1 : 1
          const next = (index + dir + items.length) % items.length
          onIndexChange(next)
        }
        // Snap back to center after drag ends
        if (ref.current) {
          ref.current.style.transition = "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)"
          ref.current.style.transform = "translateX(-50%)"
          setTimeout(() => { if (ref.current) ref.current.style.transition = "" }, 250)
        }
      }
      if (first) firedRef.current = false
      if (Math.abs(mx) > 120) cancel()
    },
    {
      axis: "x",
      filterTaps: true,
      rubberband: 0.15,
    },
  )

  if (!item) return null

  return (
    <div
      ref={ref}
      {...bind()}
      className={className}
      style={{
        height: `${heightPercent}%`,
        zIndex,
        touchAction: "none",
        transform: "translateX(-50%)",
        willChange: "transform",
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="relative h-full w-full pointer-events-none"
          style={{
            filter: "drop-shadow(0px 15px 25px rgba(0, 0, 0, 0.12))",
          }}
        >
          <Image
            src={item.src || "/placeholder.svg"}
            alt={item.name}
            fill
            sizes="(max-width: 480px) 85vw, 400px"
            className="object-contain"
            draggable={false}
            priority={false}
          />
        </motion.div>
      </AnimatePresence>

      {/* Arrow hints when multiple items available */}
      {canSwipe && (
        <>
          <button
            type="button"
            aria-label="Previous item"
            onClick={(e) => {
              e.stopPropagation()
              haptic("light")
              onIndexChange((index - 1 + items.length) % items.length)
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Next item"
            onClick={(e) => {
              e.stopPropagation()
              haptic("light")
              onIndexChange((index + 1) % items.length)
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
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

  // Build per-category items
  const topsDisplay = useMemo(() => {
    const real = closetItems
      .filter((i) => (i.category === "tops" || i.category === "outerwear") && i.source_image_url)
      .map((i) => ({ id: i.id, name: i.title, src: i.source_image_url!, closetItem: i }))
    return real.length > 0 ? real : demoItems
      .filter((d) => d.category === "tops" || d.category === "outerwear")
      .map((d) => ({ id: d.id, name: d.title, src: d.source_image_url ?? "/placeholder.svg", closetItem: d }))
  }, [closetItems, demoItems])

  const bottomsDisplay = useMemo(() => {
    const real = closetItems
      .filter((i) => i.category === "bottoms" && i.source_image_url)
      .map((i) => ({ id: i.id, name: i.title, src: i.source_image_url!, closetItem: i }))
    return real.length > 0 ? real : demoItems
      .filter((d) => d.category === "bottoms")
      .map((d) => ({ id: d.id, name: d.title, src: d.source_image_url ?? "/placeholder.svg", closetItem: d }))
  }, [closetItems, demoItems])

  const shoesDisplay = useMemo(() => {
    const real = closetItems
      .filter((i) => i.category === "shoes" && i.source_image_url)
      .map((i) => ({ id: i.id, name: i.title, src: i.source_image_url!, closetItem: i }))
    return real.length > 0 ? real : demoItems
      .filter((d) => d.category === "shoes")
      .map((d) => ({ id: d.id, name: d.title, src: d.source_image_url ?? "/placeholder.svg", closetItem: d }))
  }, [closetItems, demoItems])

  const setTop    = useCallback((i: number) => { setIndices((p) => ({ ...p, top: i })); setSaved(false) }, [])
  const setBottom = useCallback((i: number) => { setIndices((p) => ({ ...p, bottom: i })); setSaved(false) }, [])
  const setShoe   = useCallback((i: number) => { setIndices((p) => ({ ...p, shoe: i })); setSaved(false) }, [])

  const shuffleAll = useCallback(() => {
    haptic("medium")
    setSaved(false)
    setIndices({
      top: Math.floor(Math.random() * topsDisplay.length),
      bottom: Math.floor(Math.random() * bottomsDisplay.length),
      shoe: Math.floor(Math.random() * shoesDisplay.length),
    })
  }, [topsDisplay.length, bottomsDisplay.length, shoesDisplay.length])

  const handleSaveClick = () => {
    haptic("medium")
    setShowNamePrompt(true)
  }

  const handleConfirmSave = async (name: string) => {
    setShowNamePrompt(false)
    setSaving(true)

    const selected: (ClosetItem | null)[] = [
      topsDisplay[indices.top]?.closetItem ?? null,
      bottomsDisplay[indices.bottom]?.closetItem ?? null,
      shoesDisplay[indices.shoe]?.closetItem ?? null,
    ]
    const validItems = selected.filter((i): i is ClosetItem => i !== null)

    if (validItems.length === 0) {
      setSaving(false)
      return
    }

    const positions = validItems.map((item, i) => {
      const y = item.category === "shoes" ? 200
              : item.category === "bottoms" ? 70
              : -90
      return {
        item_id: item.id,
        x: 0,
        y,
        scale: item.category === "shoes" ? 0.7 : 1,
        rotation: 0,
        z: i + 1,
      }
    })

    haptic("medium")
    try {
      const result = await onSaveOutfit(name, validItems, { source: "shuffler", positions })
      if (result) {
        setSaved(true)
        haptic("medium")
        onSaved?.()
      }
    } catch {
      // save failed — user stays on the shuffler
    }
    setSaving(false)
  }

  return (
    <div className="flex h-full flex-col relative">
      {showNamePrompt && (
        <NamePrompt
          onConfirm={handleConfirmSave}
          onCancel={() => setShowNamePrompt(false)}
        />
      )}

      <header className="flex items-center justify-between px-5 pb-2 pt-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Dress Me
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Today's Shuffle
          </h1>
        </div>
      </header>

      {/* ─── OUTFIT CANVAS BOARD ─── */}
      <div className="relative flex-1 w-full mt-2 mb-2" style={{ minHeight: 0 }}>
        {/* TOP: Shirt / Outerwear — pinned to top, z-10 */}
        <SwipeableItem
          items={topsDisplay}
          index={indices.top}
          onIndexChange={setTop}
          className="absolute top-0 left-1/2 w-[min(85%,480px)] group"
          heightPercent={45}
          zIndex={10}
        />
        {/* BOTTOM: Pants / Skirt — starts at 35% to overlap shirt hem */}
        <SwipeableItem
          items={bottomsDisplay}
          index={indices.bottom}
          onIndexChange={setBottom}
          className="absolute top-[35%] left-1/2 w-[min(85%,480px)] group"
          heightPercent={50}
          zIndex={5}
        />
        {/* SHOES — pinned to bottom, z-15 so cuffs tuck behind */}
        <SwipeableItem
          items={shoesDisplay}
          index={indices.shoe}
          onIndexChange={setShoe}
          className="absolute bottom-0 left-1/2 w-[min(85%,480px)] group"
          heightPercent={25}
          zIndex={15}
        />
      </div>

      {/* ─── Controls ─── */}
      <div className="flex items-center justify-center gap-3 px-5 pb-2 pt-2">
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
          onClick={shuffleAll}
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
