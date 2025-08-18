-- Add trial-related columns to profiles table
-- This migration adds support for 3-day free trial tracking

BEGIN;

-- Add trial tracking columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_converted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_in_trial BOOLEAN DEFAULT FALSE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_trial_started ON profiles(trial_started_at);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_expires ON profiles(trial_expires_at);
CREATE INDEX IF NOT EXISTS idx_profiles_is_in_trial ON profiles(is_in_trial);

-- Update subscription_status to include 'trial' status
-- Note: This is a comment since we can't modify enum types easily
-- The webhook will handle 'trial' status in the subscription_status field

COMMIT;
