-- Security Fixes Migration
-- This migration addresses critical security vulnerabilities by:
-- 1. Removing dangerous public access policies
-- 2. Ensuring proper Row Level Security (RLS) is enabled
-- 3. Implementing secure, user-scoped access policies

-- Begin transaction for atomic execution
BEGIN;

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

-- Add security constraints and indexes for better performance
-- Add updated_at column with automatic updates if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.style_analyses 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.saved_outfits 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.user_achievements 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

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

-- Add indexes for better performance on common queries
CREATE INDEX IF NOT EXISTS idx_style_analyses_user_id ON public.style_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_style_analyses_created_at ON public.style_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_outfits_user_id ON public.saved_outfits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);

-- Add constraints to ensure data integrity
ALTER TABLE public.profiles 
ADD CONSTRAINT check_username_length 
CHECK (username IS NULL OR (length(username) >= 3 AND length(username) <= 30));

ALTER TABLE public.profiles 
ADD CONSTRAINT check_username_format 
CHECK (username IS NULL OR username ~ '^[a-zA-Z0-9_]+$');

-- Commit the transaction
COMMIT; 