-- Performance and Cleanup Fix Migration
-- This addresses ALL remaining Supabase advisor warnings:
-- 1. RLS policy performance optimization (use SELECT for auth functions)
-- 2. Cleanup duplicate policies
-- 3. Fix remaining function search_path issues
-- 4. Remove duplicate indexes

BEGIN;

-- ============================================================================
-- PART 1: Clean up ALL existing policies (comprehensive cleanup)
-- ============================================================================

-- Drop ALL policies on profiles table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_record.policyname);
    END LOOP;
END $$;

-- Drop ALL policies on style_analyses table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'style_analyses'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.style_analyses', policy_record.policyname);
    END LOOP;
END $$;

-- Drop ALL policies on saved_outfits table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'saved_outfits'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.saved_outfits', policy_record.policyname);
    END LOOP;
END $$;

-- Drop ALL policies on user_achievements table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'user_achievements'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_achievements', policy_record.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- PART 2: Create optimized RLS policies with SELECT auth functions
-- ============================================================================

-- PROFILES TABLE - Optimized policies
CREATE POLICY "profiles_select_optimized" ON public.profiles
    FOR SELECT USING (id = (select auth.uid()));

CREATE POLICY "profiles_insert_optimized" ON public.profiles
    FOR INSERT WITH CHECK (id = (select auth.uid()));

CREATE POLICY "profiles_update_optimized" ON public.profiles
    FOR UPDATE USING (id = (select auth.uid()));

CREATE POLICY "profiles_delete_optimized" ON public.profiles
    FOR DELETE USING (id = (select auth.uid()));

-- STYLE_ANALYSES TABLE - Optimized policies  
CREATE POLICY "style_analyses_select_optimized" ON public.style_analyses
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "style_analyses_insert_optimized" ON public.style_analyses
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "style_analyses_update_optimized" ON public.style_analyses
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "style_analyses_delete_optimized" ON public.style_analyses
    FOR DELETE USING (user_id = (select auth.uid()));

-- SAVED_OUTFITS TABLE - Optimized policies
CREATE POLICY "saved_outfits_select_optimized" ON public.saved_outfits
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "saved_outfits_insert_optimized" ON public.saved_outfits
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "saved_outfits_update_optimized" ON public.saved_outfits
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "saved_outfits_delete_optimized" ON public.saved_outfits
    FOR DELETE USING (user_id = (select auth.uid()));

-- USER_ACHIEVEMENTS TABLE - Optimized policies
CREATE POLICY "user_achievements_select_optimized" ON public.user_achievements
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "user_achievements_insert_optimized" ON public.user_achievements
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "user_achievements_update_optimized" ON public.user_achievements
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "user_achievements_delete_optimized" ON public.user_achievements
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================================================
-- PART 3: Fix any remaining function search_path issues
-- ============================================================================

-- Check if handle_updated_at function exists and fix it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'handle_updated_at'
    ) THEN
        -- If it exists, recreate it with secure search path
        CREATE OR REPLACE FUNCTION public.handle_updated_at()
        RETURNS TRIGGER 
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$;
    END IF;
END $$;

-- Also ensure all our main functions are properly secured
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_style_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    last_analysis_date DATE;
    days_diff INTEGER;
    current_streak INTEGER := 0;
BEGIN
    -- Only calculate streak for records with user_id
    IF NEW.user_id IS NULL THEN
        NEW.streak_count = 0;
        RETURN NEW;
    END IF;

    -- Get the most recent analysis date for this user (excluding the current insert)
    SELECT DATE(created_at), COALESCE(streak_count, 0) 
    INTO last_analysis_date, current_streak
    FROM public.style_analyses 
    WHERE user_id = NEW.user_id 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- If this is the first analysis for the user
    IF last_analysis_date IS NULL THEN
        NEW.streak_count = 1;
    ELSE
        -- Calculate days difference
        days_diff = DATE(NEW.created_at) - last_analysis_date;
        
        -- Update streak based on consecutive days
        IF days_diff = 1 THEN
            -- Consecutive day - increment streak
            NEW.streak_count = current_streak + 1;
        ELSIF days_diff = 0 THEN
            -- Same day - keep same streak
            NEW.streak_count = current_streak;
        ELSE
            -- Gap in days - reset streak to 1
            NEW.streak_count = 1;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 4: Clean up duplicate indexes
-- ============================================================================

-- Drop potentially duplicate indexes and recreate clean ones
DROP INDEX IF EXISTS idx_style_analyses_user_id;
DROP INDEX IF EXISTS idx_style_analyses_created_at;
DROP INDEX IF EXISTS idx_style_analyses_user_date;
DROP INDEX IF EXISTS idx_saved_outfits_user_id;
DROP INDEX IF EXISTS idx_user_achievements_user_id;

-- Recreate clean indexes
CREATE INDEX idx_style_analyses_user_id_clean ON public.style_analyses(user_id);
CREATE INDEX idx_style_analyses_created_at_clean ON public.style_analyses(created_at DESC);
CREATE INDEX idx_style_analyses_user_date_clean ON public.style_analyses(user_id, created_at);
CREATE INDEX idx_saved_outfits_user_id_clean ON public.saved_outfits(user_id);
CREATE INDEX idx_user_achievements_user_id_clean ON public.user_achievements(user_id);

-- ============================================================================
-- PART 5: Ensure all triggers are properly set up
-- ============================================================================

-- Recreate triggers to ensure they're working with the correct functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_style_analyses_updated_at ON public.style_analyses;
CREATE TRIGGER update_style_analyses_updated_at
    BEFORE UPDATE ON public.style_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_saved_outfits_updated_at ON public.saved_outfits;
CREATE TRIGGER update_saved_outfits_updated_at
    BEFORE UPDATE ON public.saved_outfits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_achievements_updated_at ON public.user_achievements;
CREATE TRIGGER update_user_achievements_updated_at
    BEFORE UPDATE ON public.user_achievements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_style_streak ON public.style_analyses;
CREATE TRIGGER trigger_update_style_streak
    BEFORE INSERT ON public.style_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_style_streak();

COMMIT; 