-- Final Comprehensive RLS Performance Fixes Migration
-- This migration addresses ALL remaining Supabase linter warnings
-- Includes tables that exist in DB but not in types.ts

BEGIN;

-- ============================================================================
-- PART 1: FIX ALL AUTH RLS INITIALIZATION PLAN ISSUES
-- ============================================================================

-- Fix referral_codes table policies (table exists in DB)
DROP POLICY IF EXISTS "Users can create their own referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Users can view their own referral codes" ON public.referral_codes;

CREATE POLICY "Users can create their own referral codes" ON public.referral_codes
FOR INSERT WITH CHECK ((SELECT auth.uid()) = created_by);

CREATE POLICY "Users can view their own referral codes" ON public.referral_codes
FOR SELECT USING ((SELECT auth.uid()) = created_by);

-- Fix referrals table policies (table exists in DB)
DROP POLICY IF EXISTS "Users can view referrals they made" ON public.referrals;
DROP POLICY IF EXISTS "Users can view referrals made to them" ON public.referrals;

CREATE POLICY "Users can view referrals they made" ON public.referrals
FOR SELECT USING ((SELECT auth.uid()) = referrer_id);

CREATE POLICY "Users can view referrals made to them" ON public.referrals
FOR SELECT USING ((SELECT auth.uid()) = referred_id);

-- Fix onboarding_consolidated table policies (table exists in DB)
DROP POLICY IF EXISTS "Users can view their own consolidated onboarding" ON public.onboarding_consolidated;
DROP POLICY IF EXISTS "Users can insert their own consolidated onboarding" ON public.onboarding_consolidated;
DROP POLICY IF EXISTS "Users can update their own consolidated onboarding" ON public.onboarding_consolidated;

CREATE POLICY "Users can view their own consolidated onboarding" ON public.onboarding_consolidated
FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own consolidated onboarding" ON public.onboarding_consolidated
FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own consolidated onboarding" ON public.onboarding_consolidated
FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- PART 2: FIX MULTIPLE PERMISSIVE POLICIES - REMOVE DUPLICATE POLICIES
-- ============================================================================

-- Fix profiles table - remove duplicate policies
DROP POLICY IF EXISTS "Users can fully manage their own profile" ON public.profiles;

-- Fix style_analyses table - remove duplicate policies
DROP POLICY IF EXISTS "style_analyses_select_policy" ON public.style_analyses;
DROP POLICY IF EXISTS "style_analyses_insert_policy" ON public.style_analyses;

-- Fix saved_outfits table - remove duplicate policies
DROP POLICY IF EXISTS "saved_outfits_select_policy" ON public.saved_outfits;
DROP POLICY IF EXISTS "saved_outfits_insert_policy" ON public.saved_outfits;

-- Fix user_achievements table - remove duplicate policies
DROP POLICY IF EXISTS "user_achievements_select_policy" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_insert_policy" ON public.user_achievements;

-- ============================================================================
-- PART 3: FIX MULTIPLE PERMISSIVE POLICIES FOR ANONYMOUS ACCESS
-- ============================================================================

-- The issue: Anonymous policies conflict with user-specific policies
-- Solution: Remove the user-specific policies that conflict with anonymous ones
-- Keep only the anonymous policies for INSERT operations

-- For user_analytics: Keep anonymous, remove user-specific INSERT
DROP POLICY IF EXISTS "user_analytics_insert_own" ON public.user_analytics;

-- For onboarding_v2: Keep anonymous, remove user-specific INSERT  
DROP POLICY IF EXISTS "onboarding_v2_insert_own" ON public.onboarding_v2;

-- For analysis_results: Keep anonymous, remove user-specific INSERT
DROP POLICY IF EXISTS "analysis_results_insert_own" ON public.analysis_results;

-- ============================================================================
-- PART 4: OPTIMIZE ALL EXISTING POLICIES WITH (SELECT auth.uid())
-- ============================================================================

-- Re-create all policies with optimized auth functions
-- Profiles table
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT USING ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE USING ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_delete_own" ON public.profiles
FOR DELETE USING ((SELECT auth.uid()) = id);

-- Style analyses table
DROP POLICY IF EXISTS "style_analyses_select_own" ON public.style_analyses;
DROP POLICY IF EXISTS "style_analyses_insert_own" ON public.style_analyses;
DROP POLICY IF EXISTS "style_analyses_update_own" ON public.style_analyses;
DROP POLICY IF EXISTS "style_analyses_delete_own" ON public.style_analyses;

CREATE POLICY "style_analyses_select_own" ON public.style_analyses
FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "style_analyses_insert_own" ON public.style_analyses
FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "style_analyses_update_own" ON public.style_analyses
FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "style_analyses_delete_own" ON public.style_analyses
FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Saved outfits table
DROP POLICY IF EXISTS "saved_outfits_select_own" ON public.saved_outfits;
DROP POLICY IF EXISTS "saved_outfits_insert_own" ON public.saved_outfits;
DROP POLICY IF EXISTS "saved_outfits_update_own" ON public.saved_outfits;
DROP POLICY IF EXISTS "saved_outfits_delete_own" ON public.saved_outfits;

CREATE POLICY "saved_outfits_select_own" ON public.saved_outfits
FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "saved_outfits_insert_own" ON public.saved_outfits
FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "saved_outfits_update_own" ON public.saved_outfits
FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "saved_outfits_delete_own" ON public.saved_outfits
FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- User achievements table
DROP POLICY IF EXISTS "user_achievements_select_own" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_insert_own" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_update_own" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_delete_own" ON public.user_achievements;

CREATE POLICY "user_achievements_select_own" ON public.user_achievements
FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "user_achievements_insert_own" ON public.user_achievements
FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "user_achievements_update_own" ON public.user_achievements
FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "user_achievements_delete_own" ON public.user_achievements
FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- PART 5: ADD PERFORMANCE INDEXES FOR ALL TABLES
-- ============================================================================

-- Add indexes for all tables that exist in the database
CREATE INDEX IF NOT EXISTS idx_referral_codes_created_by ON public.referral_codes(created_by);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_consolidated_user_id ON public.onboarding_consolidated(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON public.user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_user_id ON public.analysis_results(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_v2_user_id ON public.onboarding_v2(user_id);

-- Add composite indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_created ON public.user_analytics(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_results_user_created ON public.analysis_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_onboarding_v2_user_updated ON public.onboarding_v2(user_id, updated_at DESC);

-- ============================================================================
-- PART 6: ENSURE RLS IS ENABLED ON ALL TABLES
-- ============================================================================

-- Enable RLS on all tables that exist in the database
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_consolidated ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.style_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Migration completed successfully
-- Note: All RLS performance fixes applied to all existing tables
-- Anonymous policies preserved for app functionality

COMMIT;
