-- Add style_vibe field to profiles table for simplified onboarding
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS style_vibe TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_style_vibe ON profiles(style_vibe);

-- Update RLS policies to include style_vibe
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can view their own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles  
FOR UPDATE USING (auth.uid() = id); 