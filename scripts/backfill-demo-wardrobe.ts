/**
 * backfill-demo-wardrobe.ts — Seeds demo wardrobe items for all existing
 * users who completed onboarding but have zero closet items.
 *
 * Run once manually:
 *   npx tsx --tsconfig tsconfig.json scripts/backfill-demo-wardrobe.ts
 *
 * Safe to run repeatedly — upserts on id conflict, skips users who
 * already have items.
 */

import { createClient } from "@supabase/supabase-js";
import { getDemoItemsForGender } from "../src/lib/demo-wardrobe";

const SUPABASE_URL = "https://jjqwhxamjxsiotnhhqco.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_SERVICE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY env var required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seedDemoWardrobe(
  userId: string,
  gender: string | null,
): Promise<void> {
  const demoItems = getDemoItemsForGender(gender);
  const rows = demoItems.map((item) => ({
    id: item.id,
    user_id: userId,
    title: item.title,
    category: item.category,
    color: item.color,
    tags: item.tags ?? [],
    attributes: item.attributes ?? {},
    source_image_url: item.source_image_url,
  }));

  const { error } = await supabase
    .from("trendza_closet_items")
    .upsert(rows, { onConflict: "id" });

  if (error) {
    console.error(`[backfill] ❌ failed for ${userId}:`, error);
    throw error;
  }

  console.log(
    `[backfill] ✅ seeded ${rows.length} items for ${userId} (gender=${gender})`,
  );
}

async function backfill() {
  console.log("[backfill] Fetching completed users...");

  const { data: users, error } = await supabase
    .from("onboarding_v2")
    .select("user_id, step_data")
    .eq("completed", true);

  if (error) {
    console.error("[backfill] ❌ failed to fetch users:", error);
    throw error;
  }

  console.log(`[backfill] Found ${users?.length ?? 0} completed users`);

  let seeded = 0;
  let skipped = 0;

  for (const row of users ?? []) {
    // Skip users who already have items
    const { data: existing, error: checkErr } = await supabase
      .from("trendza_closet_items")
      .select("id")
      .eq("user_id", row.user_id)
      .limit(1);

    if (checkErr) {
      console.error(`[backfill] ⚠️ check failed for ${row.user_id}:`, checkErr);
      continue;
    }

    if (existing && existing.length > 0) {
      console.log(`[backfill] ⏭️ skip ${row.user_id} — already has items`);
      skipped++;
      continue;
    }

    try {
      const stepData = (row.step_data as Record<string, any>) ?? {};
      const gender = stepData?.gender?.gender ?? null;
      await seedDemoWardrobe(
        row.user_id,
        typeof gender === "string" ? gender : null,
      );
      seeded++;
    } catch (e) {
      console.error(`[backfill] ❌ error seeding ${row.user_id}:`, e);
    }
  }

  console.log(
    `\n[backfill] Done — ${seeded} seeded, ${skipped} skipped, ${(users ?? []).length} total`,
  );
}

backfill().catch((err) => {
  console.error("[backfill] ❌ fatal:", err);
  process.exit(1);
});
