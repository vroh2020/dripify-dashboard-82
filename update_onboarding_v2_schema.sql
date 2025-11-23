-- OutfitGrader AI - Updated onboarding_v2 table schema
-- This script updates the existing onboarding_v2 table to support the new 10-step flow

-- First, let's see if the table exists and what columns it has
-- Run this to check current structure:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'onboarding_v2';

-- Update the onboarding_v2 table structure
ALTER TABLE onboarding_v2 
ADD COLUMN IF NOT EXISTS style_goal TEXT,
ADD COLUMN IF NOT EXISTS pain_point TEXT,
ADD COLUMN IF NOT EXISTS closet_size TEXT,
ADD COLUMN IF NOT EXISTS shopping_frequency TEXT,
ADD COLUMN IF NOT EXISTS onboarding_image_url TEXT,
ADD COLUMN IF NOT EXISTS analysis_data JSONB,
ADD COLUMN IF NOT EXISTS closet_setup_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS items_uploaded INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT,
ADD COLUMN IF NOT EXISTS trial_start TIMESTAMP;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_onboarding_v2_user_id ON onboarding_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_v2_completed ON onboarding_v2(completed);
CREATE INDEX IF NOT EXISTS idx_onboarding_v2_subscription_tier ON onboarding_v2(subscription_tier);

-- Update RLS policies if needed
-- Enable RLS
ALTER TABLE onboarding_v2 ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own onboarding data" ON onboarding_v2;
DROP POLICY IF EXISTS "Users can insert their own onboarding data" ON onboarding_v2;
DROP POLICY IF EXISTS "Users can update their own onboarding data" ON onboarding_v2;

-- Create new RLS policies
CREATE POLICY "Users can view their own onboarding data" ON onboarding_v2
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding data" ON onboarding_v2
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding data" ON onboarding_v2
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow anonymous users to access their own data
CREATE POLICY "Anonymous users can access their own onboarding data" ON onboarding_v2
    FOR ALL USING (
        auth.uid() = user_id OR 
        (auth.role() = 'anon' AND user_id IS NOT NULL)
    );

-- Create or update the complete table structure (if starting fresh)
/*
CREATE TABLE IF NOT EXISTS onboarding_v2 (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Step tracking
  current_step INTEGER DEFAULT 1,
  completed BOOLEAN DEFAULT false,
  
  -- Screen 2: Style Goal
  style_goal TEXT,
  
  -- Screen 3: Pain Point  
  pain_point TEXT,
  
  -- Screen 4: Closet Size
  closet_size TEXT,
  
  -- Screen 5: Shopping Frequency
  shopping_frequency TEXT,
  
  -- Screen 6: First Outfit
  onboarding_image_url TEXT,
  
  -- Screen 7: Analysis Results
  analysis_data JSONB,
  
  -- Screen 9: Closet Items Uploaded
  closet_setup_completed BOOLEAN DEFAULT false,
  items_uploaded INTEGER DEFAULT 0,
  
  -- Screen 10: Subscription
  subscription_tier TEXT, -- 'weekly', 'monthly', 'lifetime', 'free'
  trial_start TIMESTAMP,
  
  -- Legacy fields (keep for backward compatibility)
  step TEXT,
  step_data JSONB,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
*/

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_onboarding_v2_updated_at ON onboarding_v2;
CREATE TRIGGER update_onboarding_v2_updated_at
    BEFORE UPDATE ON onboarding_v2
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the schema update
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'onboarding_v2'
ORDER BY ordinal_position;
