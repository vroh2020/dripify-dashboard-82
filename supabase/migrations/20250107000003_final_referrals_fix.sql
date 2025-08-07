-- Final Fix for Referrals Table Multiple Permissive Policies
-- This migration consolidates the two SELECT policies on referrals table

BEGIN;

-- ============================================================================
-- FIX MULTIPLE PERMISSIVE POLICIES FOR REFERRALS TABLE
-- ============================================================================

-- The issue: Two SELECT policies conflict with each other
-- Solution: Drop both policies and create a single consolidated policy

-- Drop the conflicting policies
DROP POLICY IF EXISTS "Users can view referrals they made" ON public.referrals;
DROP POLICY IF EXISTS "Users can view referrals made to them" ON public.referrals;

-- Create a single consolidated policy that allows users to view referrals
-- where they are either the referrer OR the referred user
CREATE POLICY "Users can view their referrals" ON public.referrals
FOR SELECT USING (
    (SELECT auth.uid()) = referrer_id OR 
    (SELECT auth.uid()) = referred_id
);

-- ============================================================================
-- OPTIONAL: REMOVE UNUSED INDEXES (INFO level warnings)
-- ============================================================================

-- Uncomment these lines if you want to remove unused indexes
-- Note: These are just performance suggestions, not critical warnings

-- DROP INDEX IF EXISTS idx_profiles_onboarding_step;
-- DROP INDEX IF EXISTS idx_profiles_last_analysis;
-- DROP INDEX IF EXISTS idx_onboarding_v2_current_step;
-- DROP INDEX IF EXISTS idx_user_analytics_user_created;
-- DROP INDEX IF EXISTS idx_analysis_results_user_created;
-- DROP INDEX IF EXISTS idx_onboarding_v2_user_updated;
-- DROP INDEX IF EXISTS idx_profiles_style_vibe;
-- DROP INDEX IF EXISTS idx_profiles_analysis_result;
-- DROP INDEX IF EXISTS idx_onboarding_v2_step;
-- DROP INDEX IF EXISTS idx_onboarding_v2_completed;
-- DROP INDEX IF EXISTS idx_referral_codes_created_by;
-- DROP INDEX IF EXISTS idx_referrals_referrer_id;
-- DROP INDEX IF EXISTS idx_referrals_referred_id;
-- DROP INDEX IF EXISTS idx_onboarding_consolidated_user_id;
-- DROP INDEX IF EXISTS idx_onboarding_consolidated_current_step;

-- Migration completed successfully
-- Note: All RLS performance warnings should now be resolved

COMMIT;
