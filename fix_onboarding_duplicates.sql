-- Fix onboarding_v2 table to prevent duplicate user entries
-- The issue is that upsert without proper unique constraints creates multiple rows

-- First, let's see the current structure and duplicates
SELECT 
  user_id,
  step,
  step_data,
  updated_at,
  completed,
  COUNT(*) as entry_count
FROM onboarding_v2 
GROUP BY user_id, step, step_data, updated_at, completed
HAVING COUNT(*) > 1;

-- Check current unique constraints
SELECT conname, contype, confkey, conkey 
FROM pg_constraint 
WHERE conrelid = 'onboarding_v2'::regclass;

-- Create a proper unique constraint on (user_id, step) combination
-- This will ensure only one row per user per step
ALTER TABLE onboarding_v2 
ADD CONSTRAINT unique_user_step 
UNIQUE (user_id, step);

-- If that fails due to existing duplicates, we need to clean them up first:
-- Remove duplicate entries keeping only the latest one per user+step
DELETE FROM onboarding_v2 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, step) id
  FROM onboarding_v2
  ORDER BY user_id, step, updated_at DESC
);

-- Then add the unique constraint
ALTER TABLE onboarding_v2 
ADD CONSTRAINT unique_user_step 
UNIQUE (user_id, step);