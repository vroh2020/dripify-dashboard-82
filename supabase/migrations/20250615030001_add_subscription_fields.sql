-- Add subscription fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ;

-- Add onboarding_data JSON field to store detailed onboarding responses
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_data JSONB;

-- Add user_type to temp_onboard_users for tracking free vs premium intent  
ALTER TABLE public.temp_onboard_users 
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'free';

-- Create index for better JSON query performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_data ON public.profiles USING GIN (onboarding_data);

-- Update RLS policies to allow access to subscription fields
ALTER POLICY "Users can view own profile." ON profiles
USING (auth.uid() = id);

ALTER POLICY "Users can update own profile." ON profiles
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id); 