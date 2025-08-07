-- Fix remaining function search path issue
-- This addresses the apply_referral_code function that still shows as vulnerable

BEGIN;

-- Drop and recreate the apply_referral_code function with proper search path
DROP FUNCTION IF EXISTS public.apply_referral_code(TEXT, UUID);

CREATE OR REPLACE FUNCTION public.apply_referral_code(
  referral_code TEXT,
  user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
  referrer_id UUID;
  referral_exists BOOLEAN;
BEGIN
  -- Set secure search path
  SET search_path = public;
  
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

COMMIT;
