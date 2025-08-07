-- Restructure onboarding_v2 to use single row per user instead of multiple rows per step
-- This makes data much easier to query and use

BEGIN;

-- Create a new consolidated structure
CREATE TABLE IF NOT EXISTS onboarding_consolidated (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Onboarding progress
  current_step TEXT DEFAULT 'welcome',
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  
  -- Step data consolidated into JSONB columns
  welcome_data JSONB DEFAULT '{}',
  vibe_data JSONB DEFAULT '{}',
  review_data JSONB DEFAULT '{}',
  how_it_works_data JSONB DEFAULT '{}',
  photo_data JSONB DEFAULT '{}',
  analysis_data JSONB DEFAULT '{}',
  teaser_data JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one row per user
  UNIQUE(user_id)
);

-- Migrate existing data from the multi-row structure to single-row structure
INSERT INTO onboarding_consolidated (user_id, current_step, welcome_data, vibe_data, review_data, how_it_works_data, photo_data, analysis_data, teaser_data, created_at, updated_at)
SELECT 
  user_id,
  'completed' as current_step,
  COALESCE((SELECT step_data FROM onboarding_v2 o2 WHERE o2.user_id = o1.user_id AND o2.step = 'welcome_completed' LIMIT 1), '{}') as welcome_data,
  COALESCE((SELECT step_data FROM onboarding_v2 o2 WHERE o2.user_id = o1.user_id AND o2.step = 'vibe_selected' LIMIT 1), '{}') as vibe_data,
  COALESCE((SELECT step_data FROM onboarding_v2 o2 WHERE o2.user_id = o1.user_id AND o2.step = 'review_prompted' LIMIT 1), '{}') as review_data,
  COALESCE((SELECT step_data FROM onboarding_v2 o2 WHERE o2.user_id = o1.user_id AND o2.step = 'how_it_works_completed' LIMIT 1), '{}') as how_it_works_data,
  COALESCE((SELECT step_data FROM onboarding_v2 o2 WHERE o2.user_id = o1.user_id AND o2.step = 'photo_uploaded' LIMIT 1), '{}') as photo_data,
  COALESCE((SELECT step_data FROM onboarding_v2 o2 WHERE o2.user_id = o1.user_id AND o2.step = 'analysis_completed' LIMIT 1), '{}') as analysis_data,
  COALESCE((SELECT step_data FROM onboarding_v2 o2 WHERE o2.user_id = o1.user_id AND o2.step = 'teaser_viewed' LIMIT 1), '{}') as teaser_data,
  MIN(o1.updated_at) as created_at,
  MAX(o1.updated_at) as updated_at
FROM onboarding_v2 o1
GROUP BY user_id
ON CONFLICT (user_id) DO NOTHING;

-- Add RLS policies
ALTER TABLE onboarding_consolidated ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own consolidated onboarding" ON onboarding_consolidated
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consolidated onboarding" ON onboarding_consolidated
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consolidated onboarding" ON onboarding_consolidated
FOR UPDATE USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_consolidated_user_id ON onboarding_consolidated(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_consolidated_current_step ON onboarding_consolidated(current_step);

COMMIT;