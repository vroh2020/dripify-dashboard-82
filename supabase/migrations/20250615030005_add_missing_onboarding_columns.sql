-- Add missing onboarding columns that the app is trying to use
-- This fixes the database schema errors

-- Add style_vibe column for vibe selection
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS style_vibe TEXT;

-- Add analysis_result column for storing analysis data
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS analysis_result JSONB;

-- Add selected_image column for storing image URLs
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS selected_image TEXT;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_profiles_style_vibe ON profiles(style_vibe);
CREATE INDEX IF NOT EXISTS idx_profiles_analysis_result ON profiles USING GIN(analysis_result);

-- Update the onboarding data function to handle these fields
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
    -- Handle specific fields
    style_vibe = COALESCE(step_data->>'style_vibe', style_vibe),
    analysis_result = COALESCE(step_data->'analysis_result', analysis_result),
    selected_image = COALESCE(step_data->>'selected_image', selected_image),
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 