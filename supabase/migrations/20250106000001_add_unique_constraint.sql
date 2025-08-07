-- Add the unique constraint that's needed for upsert to work
-- This constraint allows the onConflict parameter to function properly

BEGIN;

-- Check if the constraint already exists and drop it if it does
ALTER TABLE onboarding_v2 DROP CONSTRAINT IF EXISTS unique_user_step;

-- Clean up any duplicates first before adding the constraint
DELETE FROM onboarding_v2 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, step) id
  FROM onboarding_v2
  ORDER BY user_id, step, updated_at DESC
);

-- Add the unique constraint on (user_id, step)
ALTER TABLE onboarding_v2 
ADD CONSTRAINT unique_user_step 
UNIQUE (user_id, step);

-- Verify the constraint was created
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'onboarding_v2'::regclass 
AND conname = 'unique_user_step';

COMMIT;