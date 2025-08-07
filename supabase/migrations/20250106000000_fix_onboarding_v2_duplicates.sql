-- Clean up duplicate entries in onboarding_v2 table
-- The unique constraint already exists, we just need to clean up existing duplicates

BEGIN;

-- Clean up any existing duplicates by keeping only the latest entry per user+step
DELETE FROM onboarding_v2 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, step) id
  FROM onboarding_v2
  ORDER BY user_id, step, updated_at DESC
);

-- Add an index for better query performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_onboarding_v2_user_step 
ON onboarding_v2(user_id, step);

COMMIT;