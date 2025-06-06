-- Performance and Cleanup Fix Migration
-- This addresses ALL remaining Supabase advisor warnings

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
-- PART 3: Fix remaining function search_path issues
-- ============================================================================

-- Fix handle_updated_at function if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'handle_updated_at'
    ) THEN
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

COMMIT; 