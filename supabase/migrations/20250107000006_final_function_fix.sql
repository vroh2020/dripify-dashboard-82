-- Final comprehensive fix for apply_referral_code function
-- This addresses all possible function signatures and ensures proper search path security

BEGIN;

-- Drop ALL possible signatures of the apply_referral_code function
DROP FUNCTION IF EXISTS public.apply_referral_code(TEXT);
DROP FUNCTION IF EXISTS public.apply_referral_code(TEXT, UUID);
DROP FUNCTION IF EXISTS public.apply_referral_code(TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS public.apply_referral_code(TEXT, UUID, TEXT);

-- Also drop any functions with similar names that might be causing conflicts
DROP FUNCTION IF EXISTS public.apply_referral_code();

-- Recreate the function with proper search path security
CREATE OR REPLACE FUNCTION public.apply_referral_code(
  referral_code TEXT,
  user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
  referrer_id UUID;
  referral_exists BOOLEAN;
BEGIN
  -- Set secure search path explicitly
  SET search_path = public;
  
  -- Validate inputs
  IF referral_code IS NULL OR referral_code = '' THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is trying to use their own code
  IF user_id = (SELECT created_by FROM referral_codes WHERE code = referral_code) THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has already been referred
  SELECT EXISTS(SELECT 1 FROM referrals WHERE referred_id = user_id) INTO referral_exists;
  IF referral_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Get the referrer ID
  SELECT created_by INTO referrer_id FROM referral_codes WHERE code = referral_code;
  
  IF referrer_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Create the referral record
  INSERT INTO referrals (referrer_id, referred_id, created_at)
  VALUES (referrer_id, user_id, NOW());
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Verify the function was created correctly
DO $$
BEGIN
  -- Check if the function exists with proper search path
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'apply_referral_code'
    AND p.proconfig IS NOT NULL
    AND 'search_path=public' = ANY(p.proconfig)
  ) THEN
    RAISE EXCEPTION 'Function apply_referral_code was not created with proper search_path';
  END IF;
END $$;

COMMIT;
