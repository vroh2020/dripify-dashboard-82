import type { ClosetItem } from "@/hooks/useClosetData"
import { getDemoItemsForGender } from "@/lib/demo-wardrobe"

/**
 * Returns the gender-appropriate demo wardrobe items.
 * Routes to Female / Male sets from demo-wardrobe.ts.
 * Defaults to Female for "Other" or unknown gender.
 */
export function getGenderedDemoItems(gender: string | null): ClosetItem[] {
  return getDemoItemsForGender(gender)
}
