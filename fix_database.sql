-- Fix onboarding and payment integration for 5-step flow
-- Run this SQL directly in your Supabase SQL editor

-- Add onboarding step tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}';

-- Add payment-related fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_product_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_platform TEXT;

-- Add analysis result storage
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_analysis_result JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_analysis_date TIMESTAMP WITH TIME ZONE;

-- Add user preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_preferences JSONB DEFAULT '{}';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_expiry ON profiles(subscription_expiry);

-- Update RLS policies to include new fields
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can view their own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles  
FOR UPDATE USING (auth.uid() = id);

-- Add function to update onboarding progress
CREATE OR REPLACE FUNCTION update_onboarding_progress(
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
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to complete onboarding
CREATE OR REPLACE FUNCTION complete_onboarding(
  user_id UUID,
  final_data JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET 
    onboarding_completed = true,
    onboarding_step = 5,
    onboarding_data = onboarding_data || final_data,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position; 