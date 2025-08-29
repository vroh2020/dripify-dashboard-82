import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type SearchBody = { query: string; filters?: Record<string, unknown>; limit?: number };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

    const { query, filters, limit = 12 } = (await req.json()) as SearchBody;
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'query'" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Placeholder mocked results to unblock UI
    const results = Array.from({ length: Math.min(limit, 12) }).map((_, i) => ({
      id: crypto.randomUUID(),
      title: `${query} — Item ${i + 1}`,
      brand: "MockBrand",
      category: "tops",
      color: "black",
      price: 49.99 + i,
      currency: "USD",
      image_url: "https://placehold.co/600x800",
      product_url: "https://example.com/product",
    }));

    // Optional cache: store minimal normalized snapshot
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const snapshots = results.map((r) => ({
      external_id: r.id,
      title: r.title,
      brand: r.brand,
      category: r.category,
      color: r.color,
      price: r.price,
      currency: r.currency,
      image_url: r.image_url,
      product_url: r.product_url,
    }));
    await supabase.from("trendza_products").insert(snapshots).select("id").limit(1);

    return new Response(JSON.stringify({ items: results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Search failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

console.log("Trendza product-search function ready");

