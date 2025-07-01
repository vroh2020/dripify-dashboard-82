-- Check ALL users to see if they have the same pattern
SELECT 
  id,
  username,
  age_range,
  main_goal,
  onboarding_completed,
  created_at,
  updated_at
FROM profiles 
ORDER BY created_at DESC
LIMIT 10;

-- Check if ALL new users have the same values
SELECT 
  age_range,
  main_goal,
  COUNT(*) as user_count
FROM profiles 
WHERE created_at >= '2025-06-30'  -- Today's users
GROUP BY age_range, main_goal
ORDER BY user_count DESC; 