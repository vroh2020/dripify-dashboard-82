import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import { getDemoItemsForGender } from "../src/lib/demo-wardrobe";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://jjqwhxamjxsiotnhhqco.supabase.co";

const supabase = createClient(
  SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// CLI of the form: `tsx scripts/seed-single-user.ts [uid]` — falls back to
// the project's own test account for one-off investigations.
const DEFAULT_UID = "91f4165a-cf4e-49dd-81ea-65df53b7e67d";
const uid = process.argv[2] ?? DEFAULT_UID;

async function main() {
  // Derive gender from the user's onboarding row so we always seed the
  // gender-appropriate set without callers needing to copy-paste it.
  const { data: onboarding } = await supabase
    .from("onboarding_v2")
    .select("step_data")
    .eq("user_id", uid)
    .maybeSingle();

  const stepData = (onboarding?.step_data as Record<string, any>) ?? {};
  const rawGender = stepData?.gender?.gender ?? null;
  const gender = typeof rawGender === "string" ? rawGender : null;

  console.log(`Resolved gender for ${uid}: ${gender ?? "(unknown)"}`);

  const items = getDemoItemsForGender(gender);
  const rows = items.map((item) => ({
    id: item.id,
    user_id: uid,
    title: item.title,
    category: item.category,
    color: item.color,
    tags: item.tags ?? [],
    attributes: item.attributes ?? {},
    source_image_url: item.source_image_url,
  }));

  console.log(`Seeding ${rows.length} items for ${uid}...`);

  const { error } = await supabase
    .from("trendza_closet_items")
    .upsert(rows, { onConflict: "id" });

  if (error) {
    console.error("❌ UPSERT FAILED:", error);
  } else {
    console.log(`✅ Seeded ${rows.length} items successfully`);
  }

  // Verify
  const { count } = await supabase
    .from("trendza_closet_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", uid);

  console.log(`Verify: ${count} rows now in trendza_closet_items for user`);
}

main().catch((err) => {
  console.error("💥 seed-single-user failed:", err);
  process.exit(1);
});
