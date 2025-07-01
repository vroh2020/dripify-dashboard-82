-- Check this specific user's data
SELECT 
  id,
  username,
  age_range,
  main_goal,
  onboarding_completed,
  created_at,
  updated_at,
  (updated_at - created_at) as "time_since_creation"
FROM profiles 
WHERE id = '0879209a-502f-40d2-82cf-50fb4852fa1e';

-- Check if there are any other users with the same email pattern
SELECT 
  id,
  username,
  age_range,
  main_goal,
  created_at
FROM profiles 
WHERE username LIKE '%dripcheck%' OR id = '0879209a-502f-40d2-82cf-50fb4852fa1e'
ORDER BY created_at DESC; 