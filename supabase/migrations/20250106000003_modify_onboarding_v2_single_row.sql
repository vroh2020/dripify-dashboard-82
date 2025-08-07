-- Modify existing onboarding_v2 table to support single row per user
-- Instead of multiple rows per step, store all data in one row with JSONB columns

BEGIN;

-- First, backup existing data
CREATE TEMP TABLE onboarding_v2_backup AS 
SELECT * FROM onboarding_v2;

-- Drop the old unique constraint
ALTER TABLE onboarding_v2 DROP CONSTRAINT IF EXISTS unique_user_step;

-- Add new columns for consolidated data
ALTER TABLE onboarding_v2 
ADD COLUMN IF NOT EXISTS all_step_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS current_step TEXT DEFAULT 'welcome',
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Consolidate existing data into single rows per user
WITH consolidated_data AS (
  SELECT 
    user_id,
    jsonb_object_agg(step, step_data) as all_step_data,
    MAX(step) as current_step,
    MAX(updated_at) as updated_at,
    MIN(updated_at) as created_at
  FROM onboarding_v2_backup
  GROUP BY user_id
)
DELETE FROM onboarding_v2;

-- Insert consolidated data
INSERT INTO onboarding_v2 (user_id, step, step_data, all_step_data, current_step, updated_at)
SELECT 
  user_id,
  'consolidated' as step,
  '{}' as step_data,
  all_step_data,
  current_step,
  updated_at
FROM (
  SELECT 
    user_id,
    jsonb_object_agg(step, step_data) as all_step_data,
    MAX(step) as current_step,
    MAX(updated_at) as updated_at
  FROM onboarding_v2_backup
  GROUP BY user_id
) consolidated;

-- Add unique constraint on user_id (since we now have one row per user)
ALTER TABLE onboarding_v2 
ADD CONSTRAINT unique_user_onboarding 
UNIQUE (user_id);

-- Drop the old step column constraint if it exists
DROP INDEX IF EXISTS idx_onboarding_v2_user_step;

-- Add new index
CREATE INDEX IF NOT EXISTS idx_onboarding_v2_user_id ON onboarding_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_v2_current_step ON onboarding_v2(current_step);

COMMIT;