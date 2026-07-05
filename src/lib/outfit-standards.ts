/**
 * outfit-standards.ts
 *
 * Standard render specs for the layered Dress Me view. One box size
 * per category so tops, bottoms, and shoes all render at predictable
 * visual sizes regardless of source image aspect ratio.
 *
 * Each item still uses `object-contain`, so non-square uploads are
 * letterboxed inside their box rather than stretched.
 */

export type DressMeCategory = "tops" | "bottoms" | "shoes"

export interface DressMeSpec {
  /** Tailwind width class — `min(N%, Wpx)` clamps the box on narrow
   *  viewports while still capping at the standard's pixel max. */
  widthClass: string
  /** Box height in CSS pixels. */
  height: number
  /** Tailwind position class. */
  position: string
  /** Stacking order — higher z renders on top. */
  z: number
}

export const DRESS_ME_STANDARDS: Record<DressMeCategory, DressMeSpec> = {
  tops:    { widthClass: "w-[min(75%,240px)]", height: 240, position: "top-0",      z: 10 },
  bottoms: { widthClass: "w-[min(75%,240px)]", height: 280, position: "top-[200px]", z: 5  },
  shoes:   { widthClass: "w-[min(70%,180px)]", height: 180, position: "bottom-0",   z: 15 },
}

/** Minimum canvas height to fit the full layered composition
 *  without clipping the top of the shirt. */
export const DRESS_ME_MIN_CANVAS_HEIGHT = 600
