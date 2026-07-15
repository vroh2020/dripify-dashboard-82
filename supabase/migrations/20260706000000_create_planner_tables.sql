-- Create Planner tables for outfit calendar + AI try-on photos
BEGIN;

-- =========================
-- Planner — planned outfits per date
-- =========================
CREATE TABLE IF NOT EXISTS public.planner_outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit_id UUID REFERENCES public.trendza_outfits(id) ON DELETE SET NULL,
  planned_date DATE NOT NULL,
  notes TEXT,
  outfit_data JSONB DEFAULT '{}'::jsonb,  -- snapshot of outfit items at time of planning
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, planned_date)  -- one outfit per day
);

CREATE INDEX IF NOT EXISTS idx_planner_outfits_user_date
  ON public.planner_outfits(user_id, planned_date);

-- =========================
-- Planner — cached AI try-on images
-- =========================
CREATE TABLE IF NOT EXISTS public.planner_generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit_id UUID NOT NULL REFERENCES public.trendza_outfits(id) ON DELETE CASCADE,
  planned_date DATE NOT NULL,
  image_url TEXT,
  -- Generation status: 'pending' | 'generating' | 'completed' | 'failed'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One cached image per user+outfit combo
  UNIQUE(user_id, outfit_id)
);

CREATE INDEX IF NOT EXISTS idx_planner_gen_images_user
  ON public.planner_generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_gen_images_status
  ON public.planner_generated_images(status);

-- =========================
-- RLS
-- =========================
ALTER TABLE public.planner_outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_generated_images ENABLE ROW LEVEL SECURITY;

-- Planner outfits: owner only
DROP POLICY IF EXISTS "planner_outfits_select_own" ON public.planner_outfits;
CREATE POLICY "planner_outfits_select_own" ON public.planner_outfits
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "planner_outfits_insert_own" ON public.planner_outfits;
CREATE POLICY "planner_outfits_insert_own" ON public.planner_outfits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "planner_outfits_update_own" ON public.planner_outfits;
CREATE POLICY "planner_outfits_update_own" ON public.planner_outfits
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "planner_outfits_delete_own" ON public.planner_outfits;
CREATE POLICY "planner_outfits_delete_own" ON public.planner_outfits
  FOR DELETE USING (auth.uid() = user_id);

-- Generated images: owner only
DROP POLICY IF EXISTS "planner_gen_images_select_own" ON public.planner_generated_images;
CREATE POLICY "planner_gen_images_select_own" ON public.planner_generated_images
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "planner_gen_images_insert_own" ON public.planner_generated_images;
CREATE POLICY "planner_gen_images_insert_own" ON public.planner_generated_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "planner_gen_images_update_own" ON public.planner_generated_images;
CREATE POLICY "planner_gen_images_update_own" ON public.planner_generated_images
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "planner_gen_images_delete_own" ON public.planner_generated_images;
CREATE POLICY "planner_gen_images_delete_own" ON public.planner_generated_images
  FOR DELETE USING (auth.uid() = user_id);

COMMIT;
