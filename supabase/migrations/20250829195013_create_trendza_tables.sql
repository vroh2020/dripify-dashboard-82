-- Create Trendza tables directly
BEGIN;

-- =========================
-- Color Analysis (Style DNA)
-- =========================
CREATE TABLE IF NOT EXISTS public.trendza_color_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  undertone TEXT CHECK (undertone IN ('cool','warm','neutral')),
  season TEXT CHECK (season IN ('spring','summer','autumn','winter','soft_summer','deep_winter','light_spring','soft_autumn')),
  palette JSONB NOT NULL DEFAULT '[]'::jsonb,
  face_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =========================
-- Digital Closet
-- =========================
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
CREATE INDEX IF NOT EXISTS idx_trendza_closet_items_user_id ON public.trendza_closet_items(user_id);
CREATE INDEX IF NOT EXISTS idx_trendza_closet_items_category ON public.trendza_closet_items(category);

CREATE TABLE IF NOT EXISTS public.trendza_outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  item_ids UUID[] NOT NULL DEFAULT '{}',
  score INTEGER,
  rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trendza_outfits_user_id ON public.trendza_outfits(user_id);

-- =========================
-- Product Search (Phia)
-- =========================
CREATE TABLE IF NOT EXISTS public.trendza_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT,
  title TEXT,
  brand TEXT,
  category TEXT,
  color TEXT,
  price NUMERIC,
  currency TEXT DEFAULT 'USD',
  image_url TEXT,
  product_url TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trendza_products_category ON public.trendza_products(category);
CREATE INDEX IF NOT EXISTS idx_trendza_products_brand ON public.trendza_products(brand);

-- =========================
-- RLS
-- =========================
ALTER TABLE public.trendza_color_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trendza_closet_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trendza_outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trendza_products ENABLE ROW LEVEL SECURITY;

-- Owner policies
DROP POLICY IF EXISTS "color_profiles_select_own" ON public.trendza_color_profiles;
CREATE POLICY "color_profiles_select_own" ON public.trendza_color_profiles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "color_profiles_upsert_own" ON public.trendza_color_profiles;
CREATE POLICY "color_profiles_upsert_own" ON public.trendza_color_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "color_profiles_update_own" ON public.trendza_color_profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "closet_items_select_own" ON public.trendza_closet_items;
CREATE POLICY "closet_items_select_own" ON public.trendza_closet_items FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "closet_items_insert_own" ON public.trendza_closet_items;
CREATE POLICY "closet_items_insert_own" ON public.trendza_closet_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "closet_items_update_own" ON public.trendza_closet_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "closet_items_delete_own" ON public.trendza_closet_items FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "outfits_select_own" ON public.trendza_outfits;
CREATE POLICY "outfits_select_own" ON public.trendza_outfits FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "outfits_insert_own" ON public.trendza_outfits;
CREATE POLICY "outfits_insert_own" ON public.trendza_outfits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "outfits_update_own" ON public.trendza_outfits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "outfits_delete_own" ON public.trendza_outfits FOR DELETE USING (auth.uid() = user_id);

COMMIT;
