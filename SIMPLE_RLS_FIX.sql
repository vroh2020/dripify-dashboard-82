-- SIMPLE RLS FIX FOR 403 ERRORS
-- This allows any authenticated user (including anonymous) to access the required tables

BEGIN;

-- ============================================================================
-- PART 1: FIX ONBOARDING_V2 TABLE
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "onboarding_v2_select_own" ON public.onboarding_v2;
DROP POLICY IF EXISTS "onboarding_v2_insert_own" ON public.onboarding_v2;
DROP POLICY IF EXISTS "onboarding_v2_update_own" ON public.onboarding_v2;
DROP POLICY IF EXISTS "Allow anonymous onboarding" ON public.onboarding_v2;
DROP POLICY IF EXISTS "Users can view their own onboarding data" ON public.onboarding_v2;
DROP POLICY IF EXISTS "Users can insert their own onboarding data" ON public.onboarding_v2;
DROP POLICY IF EXISTS "Users can update their own onboarding data" ON public.onboarding_v2;

-- Create simple policies that allow any authenticated user
CREATE POLICY "Allow authenticated users to access onboarding" ON public.onboarding_v2
FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- PART 2: FIX USER_ANALYTICS TABLE
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "user_analytics_select_own" ON public.user_analytics;
DROP POLICY IF EXISTS "user_analytics_insert_own" ON public.user_analytics;
DROP POLICY IF EXISTS "user_analytics_update_own" ON public.user_analytics;
DROP POLICY IF EXISTS "Allow anonymous analytics" ON public.user_analytics;
DROP POLICY IF EXISTS "Users can view their own analytics" ON public.user_analytics;
DROP POLICY IF EXISTS "Users can insert their own analytics" ON public.user_analytics;
DROP POLICY IF EXISTS "Users can update their own analytics" ON public.user_analytics;

-- Create simple policies that allow any authenticated user
CREATE POLICY "Allow authenticated users to access analytics" ON public.user_analytics
FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- PART 3: FIX ANALYSIS_RESULTS TABLE
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "analysis_results_select_own" ON public.analysis_results;
DROP POLICY IF EXISTS "analysis_results_insert_own" ON public.analysis_results;
DROP POLICY IF EXISTS "analysis_results_update_own" ON public.analysis_results;
DROP POLICY IF EXISTS "Allow anonymous analysis" ON public.analysis_results;
DROP POLICY IF EXISTS "Users can view their own analysis results" ON public.analysis_results;
DROP POLICY IF EXISTS "Users can insert their own analysis results" ON public.analysis_results;
DROP POLICY IF EXISTS "Users can update their own analysis results" ON public.analysis_results;

-- Create simple policies that allow any authenticated user
CREATE POLICY "Allow authenticated users to access analysis results" ON public.analysis_results
FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- PART 4: ENSURE RLS IS ENABLED
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.onboarding_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that policies were created successfully
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd, 
    permissive
FROM pg_policies 
WHERE tablename IN ('onboarding_v2', 'user_analytics', 'analysis_results')
ORDER BY tablename, policyname;
