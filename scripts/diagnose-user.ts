import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(
  "https://jjqwhxamjxsiotnhhqco.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const uid = "91f4165a-cf4e-49dd-81ea-65df53b7e67d";

async function main() {
  // 1. Check onboarding_v2
  const { data: onboarding, error: onboardingErr } = await supabase
    .from("onboarding_v2")
    .select("completed, step_data")
    .eq("user_id", uid)
    .maybeSingle();

  console.log("── onboarding_v2 ──");
  console.log("error:", onboardingErr ?? "none");
  console.log("data:", JSON.stringify(onboarding, null, 2));

  // 2. Check trendza_closet_items
  const { count, error: closetErr } = await supabase
    .from("trendza_closet_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", uid);

  console.log("\n── trendza_closet_items ──");
  console.log("count:", count ?? 0);
  console.log("error:", closetErr?.message ?? "none");
}

main();
