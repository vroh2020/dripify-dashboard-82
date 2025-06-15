
-- Clean up duplicate RLS policies and optimize performance
-- This will fix all the Supabase linter warnings

-- First, drop ALL existing policies to start clean
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_policy" ON profiles;

DROP POLICY IF EXISTS "Users can view their own analyses" ON style_analyses;
DROP POLICY IF EXISTS "Users can insert their own analyses" ON style_analyses;
DROP POLICY IF EXISTS "style_analyses_policy" ON style_analyses;

DROP POLICY IF EXISTS "Users can view their own outfits" ON saved_outfits;
DROP POLICY IF EXISTS "Users can insert their own outfits" ON saved_outfits;
DROP POLICY IF EXISTS "saved_outfits_policy" ON saved_outfits;

DROP POLICY IF EXISTS "Users can view their own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can insert their own achievements" ON user_achievements;
DROP POLICY IF EXISTS "user_achievements_policy" ON user_achievements;

-- Create OPTIMIZED policies (using SELECT auth.uid() for better performance)
-- This prevents re-evaluation of auth.uid() for each row

-- Profiles table - optimized policies
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT USING ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_update_policy" ON profiles  
FOR UPDATE USING ((SELECT auth.uid()) = id);

-- Style analyses table - optimized policies
CREATE POLICY "style_analyses_select_policy" ON style_analyses
FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "style_analyses_insert_policy" ON style_analyses
FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- Saved outfits table - optimized policies
CREATE POLICY "saved_outfits_select_policy" ON saved_outfits
FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "saved_outfits_insert_policy" ON saved_outfits
FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- User achievements table - optimized policies  
CREATE POLICY "user_achievements_select_policy" ON user_achievements
FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "user_achievements_insert_policy" ON user_achievements
FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
