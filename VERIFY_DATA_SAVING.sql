-- Verify data saving for user: ac906d97-4edb-4c38-be04-e921987435cc

-- 1. Check onboarding_v2 table
SELECT 
  'onboarding_v2' as table_name,
  user_id,
  step,
  current_step,
  step_data,
  updated_at
FROM onboarding_v2 
WHERE user_id = 'ac906d97-4edb-4c38-be04-e921987435cc';

-- 2. Check user_analytics table
SELECT 
  'user_analytics' as table_name,
  user_id,
  action,
  data,
  timestamp
FROM user_analytics 
WHERE user_id = 'ac906d97-4edb-4c38-be04-e921987435cc'
ORDER BY timestamp ASC;

-- 3. Check analysis_results table
SELECT 
  'analysis_results' as table_name,
  user_id,
  score,
  image_url,
  created_at
FROM analysis_results 
WHERE user_id = 'ac906d97-4edb-4c38-be04-e921987435cc';

-- 4. Check profiles table
SELECT 
  'profiles' as table_name,
  id,
  onboarding_completed,
  onboarding_step,
  created_at,
  updated_at
FROM profiles 
WHERE id = 'ac906d97-4edb-4c38-be04-e921987435cc';
