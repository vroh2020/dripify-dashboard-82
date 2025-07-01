-- Check what's actually in your database for this user
SELECT 
  id,
  username,
  age_range,
  main_goal,
  onboarding_completed,
  created_at,
  updated_at
FROM profiles 
WHERE id = 'a52df6dd-5ccb-4adb-8c52-41d3c755bae7';

-- If no results, check all profiles to find your user
-- SELECT id, username, age_range, main_goal, onboarding_completed 
-- FROM profiles 
-- ORDER BY created_at DESC 
-- LIMIT 10; 