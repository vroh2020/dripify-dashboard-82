"use client"

import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { BottomNav, type Tab } from "@/components/whering/bottom-nav"
import { BottomSheet } from "@/components/whering/bottom-sheet"
import { Shuffler } from "@/components/whering/shuffler"
import { Wardrobe } from "@/components/whering/wardrobe"
import { Canvas } from "@/components/whering/canvas"
import { Clipper } from "@/components/whering/clipper"
import { useClosetData, type ClosetItem } from "@/hooks/useClosetData"
import { useUserGender } from "@/hooks/useUserGender"
import { getGenderedDemoItems } from "@/lib/wardrobe-data"

export default function Page() {
  const [tab, setTab] = useState<Tab>("shuffle")
  const [sheetOpen, setSheetOpen] = useState(false)
  const navigate = useNavigate()

  // Closet data hooks (same as Index.tsx dashboard)
  const { items, outfits, saveOutfit, deleteOutfit, refresh } = useClosetData()
  const { gender } = useUserGender()
  const demoItems = getGenderedDemoItems(gender)

  const handleSaveOutfit = useCallback(
    async (name: string, selectedItems: ClosetItem[], metadata?: Record<string, any>, thumbnail?: string) => {
      return saveOutfit({ name, items: selectedItems, ...(metadata !== undefined && { metadata }), ...(thumbnail !== undefined && { thumbnail }) })
    },
    [saveOutfit],
  )

  const handleAction = (action: "upload" | "plan" | "create" | "clip") => {
    setSheetOpen(false)
    if (action === "clip") setTab("clipper")
    if (action === "create") setTab("canvas")
    if (action === "upload") setTab("wardrobe")
    if (action === "plan") setTab("shuffle")
  }

  return (
    <main className="whering-theme flex min-h-dvh w-full items-center justify-center bg-muted p-0 sm:p-6">
      {/* Phone frame */}
      <div className="relative flex h-dvh w-full max-w-[420px] flex-col overflow-hidden bg-background sm:h-[860px] sm:rounded-[44px] sm:border-8 sm:border-foreground sm:shadow-2xl">
        {/* Content — scrolls above the pinned bottom nav; calc includes safe-area for notched iPhones */}
        <div className="flex-1 overflow-y-auto pt-3 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
          {tab === "shuffle" && (
            <Shuffler
              closetItems={items}
              demoItems={demoItems}
              onSaveOutfit={handleSaveOutfit}
              onSaved={() => navigate("/fits")}
            />
          )}
          {tab === "wardrobe" && (
            <Wardrobe items={items} demoItems={demoItems} onRefresh={refresh} />
          )}
          {tab === "canvas" && (
            <Canvas
              closetItems={items}
              outfits={outfits}
              demoItems={demoItems}
              onSaveOutfit={handleSaveOutfit}
              onDeleteOutfit={deleteOutfit}
              onSaved={() => navigate("/fits")}
            />
          )}
          {tab === "clipper" && <Clipper />}

          <BottomSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            onAction={handleAction}
          />
        </div>

        {/* Bottom nav — hard-pinned with fixed so Capacitor WebView never pushes it out of view.
             max-w matches the phone-frame so it doesn't bleed full-width on desktop. */}
        <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[420px]">
          <BottomNav active={tab} onTabChange={setTab} onFabPress={() => setSheetOpen(true)} />
        </div>
      </div>
    </main>
  )
}
