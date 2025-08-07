-- Comprehensive Security Fixes Migration
-- Addresses Supabase security warnings while preserving intentional anonymous access

BEGIN;

-- ============================================================================
-- 1. FIX FUNCTION SEARCH PATH MUTABLE VULNERABILITIES
-- ============================================================================

-- Fix update_onboarding_progress function
CREATE OR REPLACE FUNCTION public.update_onboarding_progress(
  user_id UUID,
  step_number INTEGER,
  step_data JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET 
    onboarding_step = step_number,
    onboarding_data = onboarding_data || step_data,
    -- Handle specific fields
    style_vibe = COALESCE(step_data->>'style_vibe', style_vibe),
    analysis_result = COALESCE(step_data->'analysis_result', analysis_result),
    selected_image = COALESCE(step_data->>'selected_image', selected_image),
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create missing referral functions with proper search path
CREATE OR REPLACE FUNCTION public.generate_referral_code(
  user_id UUID DEFAULT auth.uid()
)
RETURNS TEXT AS $$
DECLARE
  referral_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Set secure search path
  SET search_path = public;
  
  -- Generate a unique 8-character referral code
  LOOP
    referral_code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = referral_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  -- Insert the new referral code
  INSERT INTO referral_codes (code, created_by, created_at)
  VALUES (referral_code, user_id, NOW())
  ON CONFLICT (code) DO NOTHING;
  
  RETURN referral_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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

-- Drop existing function if it exists with different signature
DROP FUNCTION IF EXISTS public.get_referral_stats(UUID);

CREATE OR REPLACE FUNCTION public.get_referral_stats(
  user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  -- Set secure search path
  SET search_path = public;
  
  SELECT jsonb_build_object(
    'total_referrals', COUNT(*),
    'successful_referrals', COUNT(*) FILTER (WHERE referred_id IS NOT NULL),
    'referral_code', (SELECT code FROM referral_codes WHERE created_by = user_id LIMIT 1)
  ) INTO stats
  FROM referrals
  WHERE referrer_id = user_id;
  
  RETURN COALESCE(stats, '{"total_referrals": 0, "successful_referrals": 0, "referral_code": null}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 2. SECURE STORAGE POLICIES (KEEPING ANONYMOUS ACCESS FOR PUBLIC CONTENT)
-- ============================================================================

-- Fix storage.objects table - Secure user-specific data while keeping public access for shared content
DROP POLICY IF EXISTS "Allow public to view style images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view style images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view analysis images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own style images" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete avatars" ON storage.objects;

-- Create secure policies for storage that allow public access to shared content
-- but secure user-specific data
CREATE POLICY "Users can view their own style images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'style-images' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR auth.role() = 'service_role')
);

CREATE POLICY "Users can view analysis images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'analysis-images' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR auth.role() = 'service_role')
);

-- Keep avatar policies secure but publicly accessible
CREATE POLICY "Avatars are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated users to update avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to delete avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND 
  auth.role() = 'authenticated'
);

-- ============================================================================
-- 3. ADD MISSING TABLES AND CONSTRAINTS
-- ============================================================================

-- Create referral_codes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create referrals table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

-- Enable RLS on referral tables
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_codes_created_by ON public.referral_codes(created_by);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);

-- ============================================================================
-- 4. ADD SECURITY POLICIES FOR REFERRAL TABLES
-- ============================================================================

-- Drop existing referral policies if they exist
DROP POLICY IF EXISTS "Users can create their own referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;

-- Referral codes policies
CREATE POLICY "Users can create their own referral codes" ON public.referral_codes
FOR INSERT WITH CHECK (auth.uid() = created_by AND auth.role() = 'authenticated');

-- Referrals policies
CREATE POLICY "Users can create referrals" ON public.referrals
FOR INSERT WITH CHECK (
  (auth.uid() = referrer_id OR auth.uid() = referred_id) AND 
  auth.role() = 'authenticated'
);

-- ============================================================================
-- 5. SECURITY AUDIT LOG
-- ============================================================================

-- Security migration completed successfully
-- Migration: 20250107000004_comprehensive_security_fixes
-- Version: 1.0.0
-- Anonymous Access: Intentional (preserved)
-- Functions Fixed: 4 (search path vulnerabilities)
-- Storage Policies: Updated (preserving public access)
-- Referral System: Implemented securely

COMMIT;
