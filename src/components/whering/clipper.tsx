"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { Search, X, RotateCcw, Check, Sparkles, ArrowLeft } from "lucide-react"
import { haptic } from "@/lib/haptics"
import { FEMALE_DEMO_ITEMS } from "@/lib/demo-wardrobe"

type ClipperItem = { id: string; name: string; src: string }
import { cn } from "@/lib/utils"

type Stage = "search" | "crop" | "processing" | "done"

export function Clipper() {
  const [query, setQuery] = useState("")
  const [stage, setStage] = useState<Stage>("search")
  const [active, setActive] = useState<ClipperItem | null>(null)
  const [rotation, setRotation] = useState(0)

  // Convert demo items for the search UI — in a real build these come from a proxy/backend.
  const allItems = useMemo<ClipperItem[]>(
    () => FEMALE_DEMO_ITEMS.map((ci) => ({
      id: ci.id,
      name: ci.title,
      src: ci.source_image_url ?? "/placeholder.svg",
    })),
    [],
  )
  const results = query.trim()
    ? allItems.filter((g) => g.name.toLowerCase().includes(query.trim().toLowerCase()))
    : allItems

  const openCropper = (g: ClipperItem) => {
    haptic("medium")
    setActive(g)
    setRotation(0)
    setStage("crop")
  }

  const confirmCrop = () => {
    haptic("medium")
    setStage("processing")
    setTimeout(() => setStage("done"), 1600)
  }

  const reset = () => {
    setActive(null)
    setRotation(0)
    setStage("search")
  }

  return (
    <div className="flex h-full flex-col">
      <header className="px-5 pb-3 pt-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Web Clipper
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Find an Item</h1>
      </header>

      {/* Search bar */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-2 rounded-full bg-card px-4 py-3 soft-shadow">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stores for jackets, jeans…"
            className="flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Results grid */}
      <div className="no-scrollbar flex-1 overflow-y-scroll px-5 pb-4">
        {results.length === 0 ? (
          <p className="pt-16 text-center text-sm text-muted-foreground">
            {"No matches. Try \"jeans\" or \"boots\"."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {results.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => openCropper(g)}
                className="flex flex-col overflow-hidden rounded-2xl bg-card soft-shadow"
              >
                <div className="relative aspect-square w-full">
                  <Image src={g.src || "/placeholder.svg"} alt={g.name} fill sizes="180px" className="object-contain p-3" />
                </div>
                <span className="px-3 pb-3 pt-1 text-left text-[13px] font-medium text-foreground">
                  {g.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cropper overlay */}
      {stage !== "search" && active && (
        <div className="absolute inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm">
          {stage === "crop" && (
            <>
              <div className="flex items-center justify-between px-4 pb-2 pt-4">
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Back"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <span className="text-sm font-medium text-white">Crop your item</span>
                <button
                  type="button"
                  onClick={confirmCrop}
                  aria-label="Confirm crop"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
                >
                  <Check className="h-5 w-5" />
                </button>
              </div>

              {/* Crop stage with transparent window */}
              <div className="relative flex-1">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="relative flex items-center justify-center"
                    style={{ width: "78%", aspectRatio: "1 / 1" }}
                  >
                    {/* Crop frame */}
                    <div className="absolute inset-0 z-10 rounded-2xl border-2 border-primary">
                      <span className="absolute -left-px -top-px h-6 w-6 rounded-tl-2xl border-l-4 border-t-4 border-primary" />
                      <span className="absolute -right-px -top-px h-6 w-6 rounded-tr-2xl border-r-4 border-t-4 border-primary" />
                      <span className="absolute -bottom-px -left-px h-6 w-6 rounded-bl-2xl border-b-4 border-l-4 border-primary" />
                      <span className="absolute -bottom-px -right-px h-6 w-6 rounded-br-2xl border-b-4 border-r-4 border-primary" />
                    </div>
                    <div
                      className="relative h-[85%] w-[85%]"
                      style={{ transform: `rotate(${rotation}deg)`, transition: "transform 0.05s linear" }}
                    >
                      <Image src={active.src || "/placeholder.svg"} alt={active.name} fill sizes="320px" className="object-contain" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Rotate slider */}
              <div className="px-6 pb-10 pt-4">
                <div className="mb-3 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    <span className="text-sm">Straighten</span>
                  </div>
                  <span className="text-sm tabular-nums text-white/70">{rotation}°</span>
                </div>
                <input
                  type="range"
                  min={-45}
                  max={45}
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="w-full accent-primary"
                  aria-label="Rotate image"
                />
              </div>
            </>
          )}

          {stage === "processing" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 px-10 text-center">
              <div className="relative h-40 w-40">
                <Image src={active.src || "/placeholder.svg"} alt={active.name} fill sizes="160px" className="object-contain animate-pulse" />
              </div>
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-[15px] font-medium">Removing background…</span>
              </div>
              <div className="h-1 w-40 overflow-hidden rounded-full bg-white/20">
                <div className="h-full w-1/2 animate-[loading_1.4s_ease-in-out_infinite] rounded-full bg-primary" />
              </div>
            </div>
          )}

          {stage === "done" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 px-10 text-center">
              <div className="relative h-44 w-44 rounded-3xl bg-card soft-shadow">
                <Image src={active.src || "/placeholder.svg"} alt={active.name} fill sizes="176px" className="object-contain p-4" />
                <span className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-5 w-5" />
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Added to Wardrobe</h2>
                <p className="mt-1 text-sm text-white/60">{active.name} is ready to style.</p>
              </div>
              <button
                type="button"
                onClick={reset}
                className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground"
              >
                Clip Another
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </div>
  )
}
