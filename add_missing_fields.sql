-- Add only the missing fields needed for 5-step onboarding
-- Run this in your Supabase SQL editor

-- Check what fields we already have
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add only the missing fields for 5-step onboarding
-- 1. Onboarding step tracking (if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step_number INTEGER DEFAULT 1;

-- 2. Onboarding data storage (if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}';

-- 3. Analysis result storage (if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_analysis_result JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_analysis_date TIMESTAMP WITH TIME ZONE;

-- 4. User preferences (if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_preferences JSONB DEFAULT '{}';

-- 5. Payment platform tracking (if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_product_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_platform TEXT;

-- Create indexes for better performance (if not exist)
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_step ON profiles(onboarding_step_number);
CREATE INDEX IF NOT EXISTS idx_profiles_last_analysis ON profiles(last_analysis_date);

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
AND column_name IN ('onboarding_step_number', 'onboarding_data', 'last_analysis_result', 'last_analysis_date', 'user_preferences', 'subscription_product_id', 'subscription_platform')
ORDER BY column_name; 