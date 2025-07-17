-- Create temp_onboard_users table for anonymous onboarding
CREATE TABLE public.temp_onboard_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL,
  onboarding_step INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed BOOLEAN DEFAULT false,
  
  -- Store onboarding responses
  heard_about TEXT,
  age_range TEXT,
  gender TEXT,
  style_goal TEXT,
  clothing_category TEXT,
  budget TEXT,
  favorite_brands TEXT[],
  color_preference TEXT,
  occasions TEXT[],
  selfie_url TEXT,
  weekly_reports BOOLEAN,
  instant_suggestions BOOLEAN,
  color_palette TEXT,
  shop_frequency TEXT,
  account_choice TEXT
);

-- Enable RLS
ALTER TABLE public.temp_onboard_users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read/write their own device data
CREATE POLICY "Allow device access to own data" ON public.temp_onboard_users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create account deletion edge function
CREATE OR REPLACE FUNCTION public.delete_user_and_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id UUID := auth.uid();
BEGIN
  -- Delete from all user tables
  DELETE FROM public.saved_outfits WHERE user_id = user_id;
  DELETE FROM public.style_analyses WHERE user_id = user_id;
  DELETE FROM public.user_achievements WHERE user_id = user_id;
  DELETE FROM public.profiles WHERE id = user_id;
  
  -- Note: auth.users deletion must be done via edge function with admin key
END;
$$;