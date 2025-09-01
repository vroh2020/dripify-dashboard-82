import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("", { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create the trendza tables
    const createTablesSQL = `
      -- Create Trendza tables
      BEGIN;

      -- Digital Closet
      CREATE TABLE IF NOT EXISTS public.trendza_closet_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        source_image_url TEXT,
        title TEXT,
        brand TEXT,
        category TEXT,
        color TEXT,
        season TEXT,
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.trendza_outfits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        name TEXT,
        item_ids UUID[] NOT NULL DEFAULT '{}',
        score INTEGER,
        rationale TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_trendza_closet_items_user_id ON public.trendza_closet_items(user_id);
      CREATE INDEX IF NOT EXISTS idx_trendza_outfits_user_id ON public.trendza_outfits(user_id);

      -- Enable RLS
      ALTER TABLE public.trendza_closet_items ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.trendza_outfits ENABLE ROW LEVEL SECURITY;

      -- Create policies
      CREATE POLICY IF NOT EXISTS "closet_items_select_own" ON public.trendza_closet_items FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY IF NOT EXISTS "closet_items_insert_own" ON public.trendza_closet_items FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY IF NOT EXISTS "closet_items_update_own" ON public.trendza_closet_items FOR UPDATE USING (auth.uid() = user_id);
      CREATE POLICY IF NOT EXISTS "closet_items_delete_own" ON public.trendza_closet_items FOR DELETE USING (auth.uid() = user_id);

      CREATE POLICY IF NOT EXISTS "outfits_select_own" ON public.trendza_outfits FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY IF NOT EXISTS "outfits_insert_own" ON public.trendza_outfits FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY IF NOT EXISTS "outfits_update_own" ON public.trendza_outfits FOR UPDATE USING (auth.uid() = user_id);
      CREATE POLICY IF NOT EXISTS "outfits_delete_own" ON public.trendza_outfits FOR DELETE USING (auth.uid() = user_id);

      COMMIT;
    `;

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { 
      sql: createTablesSQL 
    });

    if (error) {
      console.error('Error creating tables:', error);
      return new Response(
        JSON.stringify({ error: "Failed to create tables", details: error.message }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Tables created successfully" }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error('Create tables error:', e);
    return new Response(
      JSON.stringify({ error: "Failed to create tables", details: e.message }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

console.log("Create tables function ready");
