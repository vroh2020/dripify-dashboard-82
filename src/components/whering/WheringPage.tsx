"use client"

import { useState } from "react"
import { BottomNav, type Tab } from "@/components/whering/bottom-nav"
import { BottomSheet } from "@/components/whering/bottom-sheet"
import { Shuffler } from "@/components/whering/shuffler"
import { Wardrobe } from "@/components/whering/wardrobe"
import { Canvas } from "@/components/whering/canvas"
import { Clipper } from "@/components/whering/clipper"

export default function Page() {
  const [tab, setTab] = useState<Tab>("shuffle")
  const [sheetOpen, setSheetOpen] = useState(false)

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
        {/* Content */}
        <div className="relative min-h-0 flex-1 overflow-hidden pt-3">
          {tab === "shuffle" && <Shuffler />}
          {tab === "wardrobe" && <Wardrobe />}
          {tab === "canvas" && <Canvas />}
          {tab === "clipper" && <Clipper />}

          <BottomSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            onAction={handleAction}
          />
        </div>

        <BottomNav active={tab} onTabChange={setTab} onFabPress={() => setSheetOpen(true)} />
      </div>
    </main>
  )
}
