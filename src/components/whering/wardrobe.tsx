"use client"

import { useState } from "react"
import Image from "next/image"
import { haptic } from "@/lib/haptics"
import { cn } from "@/lib/utils"
import type { ClosetItem } from "@/hooks/useClosetData"
import { FEMALE_DEMO_ITEMS } from "@/lib/demo-wardrobe"
import { PullToRefresh } from "@/components/common/PullToRefresh"

const filters = [
  { key: "all", label: "All" },
  { key: "tops", label: "Tops" },
  { key: "bottoms", label: "Bottoms" },
  { key: "shoes", label: "Shoes" },
  { key: "dresses", label: "Dresses" },
  { key: "outerwear", label: "Outerwear" },
  { key: "accessories", label: "Accessories" },
  { key: "bags", label: "Bags" },
] as const

type FilterKey = (typeof filters)[number]["key"]

interface WardrobeProps {
  items: ClosetItem[]
  demoItems?: ClosetItem[]
  onRefresh: () => void
}

export function Wardrobe({ items, demoItems, onRefresh }: WardrobeProps) {
  const [filter, setFilter] = useState<FilterKey>("all")

  // Use gender-aware demo items when closet is empty
  const displayItems = items.length > 0 ? items : (demoItems ?? FEMALE_DEMO_ITEMS)

  const filteredItems =
    filter === "all"
      ? displayItems
      : displayItems.filter((g) => g.category === filter)

  return (
    <div className="flex h-full flex-col">
      <header className="px-5 pb-3 pt-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          My Closet
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Wardrobe
          <span className="ml-2 text-base font-normal text-muted-foreground">
            {displayItems.length} items
          </span>
        </h1>
      </header>

      {/* Filter chips */}
      {displayItems.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-scroll px-5 pb-3">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                haptic("light")
                setFilter(f.key)
              }}
              className={cn(
                "flex-none rounded-full px-4 py-2 text-sm font-medium transition-colors",
                filter === f.key
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground soft-shadow",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Items grid — wrapped in pull-to-refresh when items exist */}
      {displayItems.length > 0 ? (
        <PullToRefresh onRefresh={onRefresh} className="flex-1 px-5 pb-4">
          <div className="grid grid-cols-2 gap-3 pt-1">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col overflow-hidden rounded-2xl bg-card soft-shadow"
              >
                <div className="relative aspect-square w-full">
                  <Image
                    src={item.source_image_url || "/placeholder.svg"}
                    alt={item.title}
                    fill
                    sizes="180px"
                    className="object-contain p-3"
                  />
                </div>
                <span className="px-3 pb-3 pt-1 text-[13px] font-medium text-foreground">
                  {item.title}
                </span>
              </div>
            ))}
          </div>
          {filteredItems.length === 0 && filter !== "all" && (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">
                No {filters.find((f) => f.key === filter)?.label.toLowerCase()} items yet
              </p>
            </div>
          )}
        </PullToRefresh>
      ) : null}
    </div>
  )
}
