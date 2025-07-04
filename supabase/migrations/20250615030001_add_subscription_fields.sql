-- Add subscription fields to profiles table
ALTER TABLE profiles
ADD COLUMN subscription_status text DEFAULT 'inactive',
ADD COLUMN subscription_expiry timestamptz;

-- Update RLS policies to allow access to subscription fields
ALTER POLICY "Users can view own profile." ON profiles
USING (auth.uid() = id);

ALTER POLICY "Users can update own profile." ON profiles
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id); 