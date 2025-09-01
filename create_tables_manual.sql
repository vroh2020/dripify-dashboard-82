-- Manual table creation for Trendza closet functionality
-- Run this in your Supabase SQL editor

-- Create closet items table
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

-- Create outfits table
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
CREATE INDEX IF NOT EXISTS idx_trendza_closet_items_category ON public.trendza_closet_items(category);
CREATE INDEX IF NOT EXISTS idx_trendza_outfits_user_id ON public.trendza_outfits(user_id);

-- Enable RLS
ALTER TABLE public.trendza_closet_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trendza_outfits ENABLE ROW LEVEL SECURITY;

-- Create policies for closet items
DROP POLICY IF EXISTS "closet_items_select_own" ON public.trendza_closet_items;
CREATE POLICY "closet_items_select_own" ON public.trendza_closet_items FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "closet_items_insert_own" ON public.trendza_closet_items;
CREATE POLICY "closet_items_insert_own" ON public.trendza_closet_items FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "closet_items_update_own" ON public.trendza_closet_items;
CREATE POLICY "closet_items_update_own" ON public.trendza_closet_items FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "closet_items_delete_own" ON public.trendza_closet_items;
CREATE POLICY "closet_items_delete_own" ON public.trendza_closet_items FOR DELETE USING (auth.uid() = user_id);

-- Create policies for outfits
DROP POLICY IF EXISTS "outfits_select_own" ON public.trendza_outfits;
CREATE POLICY "outfits_select_own" ON public.trendza_outfits FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "outfits_insert_own" ON public.trendza_outfits;
CREATE POLICY "outfits_insert_own" ON public.trendza_outfits FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "outfits_update_own" ON public.trendza_outfits;
CREATE POLICY "outfits_update_own" ON public.trendza_outfits FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "outfits_delete_own" ON public.trendza_outfits;
CREATE POLICY "outfits_delete_own" ON public.trendza_outfits FOR DELETE USING (auth.uid() = user_id);
