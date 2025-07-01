-- Fix onboarding security and data storage issues
-- This migration adds proper RLS policies and fixes data integrity

BEGIN;

-- ============================================================================
-- PART 1: Add proper RLS policies for all tables
-- ============================================================================

-- Enable RLS on all tables (ensure it's on)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.style_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to rebuild them properly
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

DROP POLICY IF EXISTS "style_analyses_select_own" ON public.style_analyses;
DROP POLICY IF EXISTS "style_analyses_insert_own" ON public.style_analyses;
DROP POLICY IF EXISTS "style_analyses_update_own" ON public.style_analyses;
DROP POLICY IF EXISTS "style_analyses_delete_own" ON public.style_analyses;

DROP POLICY IF EXISTS "saved_outfits_select_own" ON public.saved_outfits;
DROP POLICY IF EXISTS "saved_outfits_insert_own" ON public.saved_outfits;
DROP POLICY IF EXISTS "saved_outfits_update_own" ON public.saved_outfits;
DROP POLICY IF EXISTS "saved_outfits_delete_own" ON public.saved_outfits;

DROP POLICY IF EXISTS "user_achievements_select_own" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_insert_own" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_update_own" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_delete_own" ON public.user_achievements;

-- Create secure RLS policies for profiles table
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON public.profiles
    FOR DELETE USING (auth.uid() = id);

-- Create secure RLS policies for style_analyses table
CREATE POLICY "style_analyses_select_own" ON public.style_analyses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "style_analyses_insert_own" ON public.style_analyses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "style_analyses_update_own" ON public.style_analyses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "style_analyses_delete_own" ON public.style_analyses
    FOR DELETE USING (auth.uid() = user_id);

-- Create secure RLS policies for saved_outfits table
CREATE POLICY "saved_outfits_select_own" ON public.saved_outfits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "saved_outfits_insert_own" ON public.saved_outfits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_outfits_update_own" ON public.saved_outfits
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "saved_outfits_delete_own" ON public.saved_outfits
    FOR DELETE USING (auth.uid() = user_id);

-- Create secure RLS policies for user_achievements table
CREATE POLICY "user_achievements_select_own" ON public.user_achievements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_achievements_insert_own" ON public.user_achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_achievements_update_own" ON public.user_achievements
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_achievements_delete_own" ON public.user_achievements
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- PART 2: Add missing columns for proper onboarding data storage
-- ============================================================================

-- Add age_range and main_goal columns to profiles if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS age_range TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS main_goal TEXT;

-- Add comprehensive onboarding tracking fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'welcome';

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS payment_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS test_photo_uploaded BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS test_photo_url TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS analysis_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_analysis_score INTEGER;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Add subscription tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- PART 3: Fix the handle_new_user function to be more secure
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    username, 
    age_range,
    main_goal,
    onboarding_completed,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username', 
      split_part(COALESCE(NEW.email, 'user'), '@', 1)
    ),
    NEW.raw_user_meta_data->>'age_range',
    NEW.raw_user_meta_data->>'main_goal',
    COALESCE((NEW.raw_user_meta_data->>'onboarding_completed')::boolean, false),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PART 4: Add performance indexes
-- ============================================================================

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON public.profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_style_analyses_user_created ON public.style_analyses(user_id, created_at DESC);

COMMIT;
