-- Clear ALL onboarding data for ALL users
-- Simple version - only columns that exist

UPDATE profiles 
SET 
  age_range = NULL,
  main_goal = NULL,
  onboarding_completed = false,
  updated_at = NOW()
WHERE id IS NOT NULL;

-- Check how many users were updated
SELECT COUNT(*) as "Users Reset" FROM profiles; 