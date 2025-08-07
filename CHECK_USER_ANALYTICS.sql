-- Check user_analytics data for user: ac906d97-4edb-4c38-be04-e921987435cc

-- 1. Get all analytics records for this user
SELECT 
  id,
  user_id,
  action,
  data,
  timestamp
FROM user_analytics 
WHERE user_id = 'ac906d97-4edb-4c38-be04-e921987435cc'
ORDER BY timestamp ASC;

-- 2. Check onboarding_v2 data for this user
SELECT 
  user_id,
  step,
  current_step,
  step_data,
  all_step_data,
  completed,
  updated_at
FROM onboarding_v2 
WHERE user_id = 'ac906d97-4edb-4c38-be04-e921987435cc';

-- 3. Check analysis_results data for this user
SELECT 
  id,
  user_id,
  score,
  image_url,
  analysis_data
FROM analysis_results 
WHERE user_id = 'ac906d97-4edb-4c38-be04-e921987435cc';

-- 4. Summary of all data for this user
SELECT 
  'profiles' as table_name,
  COUNT(*) as record_count
FROM profiles 
WHERE id = 'ac906d97-4edb-4c38-be04-e921987435cc'

UNION ALL

SELECT 
  'onboarding_v2' as table_name,
  COUNT(*) as record_count
FROM onboarding_v2 
WHERE user_id = 'ac906d97-4edb-4c38-be04-e921987435cc'

UNION ALL

SELECT 
  'user_analytics' as table_name,
  COUNT(*) as record_count
FROM user_analytics 
WHERE user_id = 'ac906d97-4edb-4c38-be04-e921987435cc'

UNION ALL

SELECT 
  'analysis_results' as table_name,
  COUNT(*) as record_count
FROM analysis_results 
WHERE user_id = 'ac906d97-4edb-4c38-be04-e921987435cc';
