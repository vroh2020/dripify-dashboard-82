-- Fix Anonymous RLS Policies for Drip Max App
-- This fixes the 403 errors by allowing anonymous users to access the required tables

BEGIN;

-- ============================================================================
-- PART 1: FIX ANONYMOUS POLICIES FOR ONBOARDING_V2
-- ============================================================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "onboarding_v2_select_own" ON public.onboarding_v2;
DROP POLICY IF EXISTS "onboarding_v2_insert_own" ON public.onboarding_v2;
DROP POLICY IF EXISTS "onboarding_v2_update_own" ON public.onboarding_v2;
DROP POLICY IF EXISTS "Allow anonymous onboarding" ON public.onboarding_v2;

-- Create policies that allow both authenticated and anonymous users
CREATE POLICY "onboarding_v2_select_own" ON public.onboarding_v2
FOR SELECT USING (
    (SELECT auth.uid()) = user_id OR 
    (SELECT auth.uid()) IS NOT NULL
);

CREATE POLICY "onboarding_v2_insert_own" ON public.onboarding_v2
FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = user_id OR 
    (SELECT auth.uid()) IS NOT NULL
);

CREATE POLICY "onboarding_v2_update_own" ON public.onboarding_v2
FOR UPDATE USING (
    (SELECT auth.uid()) = user_id OR 
    (SELECT auth.uid()) IS NOT NULL
);

-- ============================================================================
-- PART 2: FIX ANONYMOUS POLICIES FOR USER_ANALYTICS
-- ============================================================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "user_analytics_select_own" ON public.user_analytics;
DROP POLICY IF EXISTS "user_analytics_insert_own" ON public.user_analytics;
DROP POLICY IF EXISTS "user_analytics_update_own" ON public.user_analytics;
DROP POLICY IF EXISTS "Allow anonymous analytics" ON public.user_analytics;

-- Create policies that allow both authenticated and anonymous users
CREATE POLICY "user_analytics_select_own" ON public.user_analytics
FOR SELECT USING (
    (SELECT auth.uid()) = user_id OR 
    (SELECT auth.uid()) IS NOT NULL
);

CREATE POLICY "user_analytics_insert_own" ON public.user_analytics
FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = user_id OR 
    (SELECT auth.uid()) IS NOT NULL
);

CREATE POLICY "user_analytics_update_own" ON public.user_analytics
FOR UPDATE USING (
    (SELECT auth.uid()) = user_id OR 
    (SELECT auth.uid()) IS NOT NULL
);

-- ============================================================================
-- PART 3: FIX ANONYMOUS POLICIES FOR ANALYSIS_RESULTS
-- ============================================================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "analysis_results_select_own" ON public.analysis_results;
DROP POLICY IF EXISTS "analysis_results_insert_own" ON public.analysis_results;
DROP POLICY IF EXISTS "analysis_results_update_own" ON public.analysis_results;
DROP POLICY IF EXISTS "Allow anonymous analysis" ON public.analysis_results;

-- Create policies that allow both authenticated and anonymous users
CREATE POLICY "analysis_results_select_own" ON public.analysis_results
FOR SELECT USING (
    (SELECT auth.uid()) = user_id OR 
    (SELECT auth.uid()) IS NOT NULL
);

CREATE POLICY "analysis_results_insert_own" ON public.analysis_results
FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = user_id OR 
    (SELECT auth.uid()) IS NOT NULL
);

CREATE POLICY "analysis_results_update_own" ON public.analysis_results
FOR UPDATE USING (
    (SELECT auth.uid()) = user_id OR 
    (SELECT auth.uid()) IS NOT NULL
);

-- ============================================================================
-- PART 4: ENSURE RLS IS ENABLED ON ALL TABLES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.onboarding_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to check the policies)
-- ============================================================================

-- Check current policies for onboarding_v2
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'onboarding_v2';

-- Check current policies for user_analytics
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'user_analytics';

-- Check current policies for analysis_results
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'analysis_results';
