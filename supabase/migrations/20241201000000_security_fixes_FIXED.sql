-- Complete Security Fixes Migration (FIXED VERSION)
-- This addresses ALL the security issues mentioned in Supabase advisor
-- FIXED: PostgreSQL constraint syntax compatibility

-- Begin transaction for atomic execution
BEGIN;

-- ============================================================================
-- PART 1: Drop dangerous policies and ensure RLS is enabled
-- ============================================================================

-- First, drop any dangerous policies that allow public access
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Allow public access" ON public.profiles;
DROP POLICY IF EXISTS "Public read access" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;

-- Drop any overly permissive policies on other tables
DROP POLICY IF EXISTS "Public read access" ON public.style_analyses;
DROP POLICY IF EXISTS "Public read access" ON public.saved_outfits;
DROP POLICY IF EXISTS "Public read access" ON public.user_achievements;

-- Ensure RLS is enabled on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.style_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to rebuild them properly
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own analyses" ON public.style_analyses;
DROP POLICY IF EXISTS "Users can create own analyses" ON public.style_analyses;
DROP POLICY IF EXISTS "Users can update own analyses" ON public.style_analyses;
DROP POLICY IF EXISTS "Users can delete own analyses" ON public.style_analyses;

DROP POLICY IF EXISTS "Users can view own outfits" ON public.saved_outfits;
DROP POLICY IF EXISTS "Users can create own outfits" ON public.saved_outfits;
DROP POLICY IF EXISTS "Users can update own outfits" ON public.saved_outfits;
DROP POLICY IF EXISTS "Users can delete own outfits" ON public.saved_outfits;

DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can create own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can update own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can delete own achievements" ON public.user_achievements;

-- ============================================================================
-- PART 2: Create secure RLS policies
-- ============================================================================

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
-- PART 3: Fix all function search_path security vulnerabilities
-- ============================================================================

-- 1. Fix handle_new_user function (secure user profile creation)
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

-- 2. Fix update_updated_at_column function (this is what advisor calls "handle_updated_at")
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

-- 3. Create the missing update_style_streak function 
-- This function will properly calculate and update streak counts in the database
-- This addresses the security vulnerability by moving streak logic from frontend to database
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
-- PART 4: Add necessary columns and constraints
-- ============================================================================

-- Add updated_at columns if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.style_analyses 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.saved_outfits 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.user_achievements 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add streak_count column if not exists
ALTER TABLE public.style_analyses 
ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0;

-- ============================================================================
-- PART 5: Create triggers with secured functions
-- ============================================================================

-- Recreate the trigger with the secured function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create triggers for automatic timestamp updates
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

-- Create trigger for automatic streak updates (NEW - this was missing!)
DROP TRIGGER IF EXISTS trigger_update_style_streak ON public.style_analyses;
CREATE TRIGGER trigger_update_style_streak
    BEFORE INSERT ON public.style_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_style_streak();

-- ============================================================================
-- PART 6: Add performance indexes and data integrity constraints
-- ============================================================================

-- Add indexes for better performance on common queries
CREATE INDEX IF NOT EXISTS idx_style_analyses_user_id ON public.style_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_style_analyses_created_at ON public.style_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_style_analyses_user_date ON public.style_analyses(user_id, DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_saved_outfits_user_id ON public.saved_outfits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);

-- Add constraints to ensure data integrity (FIXED SYNTAX)
-- Use DO blocks to safely add constraints
DO $$
BEGIN
    -- Add username length constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_username_length' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT check_username_length 
        CHECK (username IS NULL OR (length(username) >= 3 AND length(username) <= 30));
    END IF;
END $$;

DO $$
BEGIN
    -- Add username format constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_username_format' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT check_username_format 
        CHECK (username IS NULL OR username ~ '^[a-zA-Z0-9_]+$');
    END IF;
END $$;

DO $$
BEGIN
    -- Add streak count constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_streak_count_positive' 
        AND table_name = 'style_analyses'
    ) THEN
        ALTER TABLE public.style_analyses 
        ADD CONSTRAINT check_streak_count_positive 
        CHECK (streak_count >= 0);
    END IF;
END $$;

DO $$
BEGIN
    -- Add total score range constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_total_score_range' 
        AND table_name = 'style_analyses'
    ) THEN
        ALTER TABLE public.style_analyses 
        ADD CONSTRAINT check_total_score_range 
        CHECK (total_score >= 0 AND total_score <= 100);
    END IF;
END $$;

-- ============================================================================
-- PART 7: Update existing records to have proper streak counts
-- ============================================================================

-- Update existing records with calculated streaks (run this carefully)
-- This will recalculate streaks for all existing records
DO $$
DECLARE
    user_record RECORD;
    analysis_record RECORD;
    last_date DATE;
    current_streak INTEGER;
BEGIN
    -- Process each user's analyses
    FOR user_record IN 
        SELECT DISTINCT user_id 
        FROM public.style_analyses 
        WHERE user_id IS NOT NULL
        ORDER BY user_id
    LOOP
        last_date := NULL;
        current_streak := 0;
        
        -- Process analyses in chronological order for this user
        FOR analysis_record IN
            SELECT id, created_at
            FROM public.style_analyses 
            WHERE user_id = user_record.user_id
            ORDER BY created_at ASC
        LOOP
            IF last_date IS NULL THEN
                -- First analysis
                current_streak := 1;
            ELSIF DATE(analysis_record.created_at) = last_date THEN
                -- Same day - keep streak
                -- current_streak remains same
            ELSIF DATE(analysis_record.created_at) = last_date + 1 THEN
                -- Next day - increment
                current_streak := current_streak + 1;
            ELSE
                -- Gap - reset
                current_streak := 1;
            END IF;
            
            -- Update the record
            UPDATE public.style_analyses 
            SET streak_count = current_streak 
            WHERE id = analysis_record.id;
            
            last_date := DATE(analysis_record.created_at);
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- PART 8: Add foreign key covering indexes (FINAL FIX)
-- ============================================================================

-- These indexes are specifically needed to cover foreign key constraints
-- This eliminates the "unindexed foreign key" performance warnings

-- Drop any problematic duplicate indexes first
DROP INDEX IF EXISTS public.idx_style_analyses_user_id_clean;
DROP INDEX IF EXISTS public.idx_saved_outfits_user_id_clean;
DROP INDEX IF EXISTS public.idx_user_achievements_user_id_clean;

-- Create proper foreign key covering indexes
-- Note: We already have some of these from Part 6, but ensuring they exist
CREATE INDEX IF NOT EXISTS idx_style_analyses_user_id ON public.style_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_outfits_user_id ON public.saved_outfits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);

-- Commit the transaction
COMMIT; 