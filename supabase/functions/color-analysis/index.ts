import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type AnalyzeBody = { image: string };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("", { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    const { image } = (await req.json()) as AnalyzeBody;
    if (!image) {
      return new Response(JSON.stringify({ error: "Missing 'image' base64" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Placeholder deterministic response to unblock UI integration
    const result = {
      undertone: "neutral",
      season: "soft_summer",
      palette: ["#F6E8E0", "#C9D6EA", "#B8C1C8", "#8AA3B2"],
      faceMetrics: { notes: "stub" },
    };

    // Optional: persist if authenticated via Supabase JWT
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const jwt = authHeader.split(" ")[1];
      const { data: userData } = await supabase.auth.getUser(jwt);
      const userId = userData.user?.id;
      if (userId) {
        await supabase.from("trendza_color_profiles").upsert(
          {
            user_id: userId,
            undertone: result.undertone,
            season: result.season,
            palette: result.palette,
            face_metrics: result.faceMetrics,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Color analysis failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

console.log("Trendza color-analysis function ready");

