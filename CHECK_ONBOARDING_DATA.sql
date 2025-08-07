-- Clear view of onboarding_v2 data
SELECT 
  user_id,
  step,
  step_data,
  updated_at
FROM public.onboarding_v2 
ORDER BY updated_at DESC;

-- Count of steps per user
SELECT 
  user_id,
  COUNT(*) as total_steps,
  MAX(updated_at) as last_activity
FROM public.onboarding_v2 
GROUP BY user_id
ORDER BY last_activity DESC;

-- Show step_data contents more clearly
SELECT 
  user_id,
  step,
  step_data::text as step_details,
  updated_at
FROM public.onboarding_v2 
ORDER BY updated_at DESC;

-- Check what's actually stored in onboarding_v2 for user: ac906d97-4edb-4c38-be04-e921987435cc

-- 1. Check onboarding_v2 table data (using correct column names)
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

-- 2. Check if there are any records at all in onboarding_v2
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users
FROM onboarding_v2;

-- 3. Check the most recent onboarding_v2 records
SELECT 
  user_id,
  step,
  current_step,
  updated_at
FROM onboarding_v2 
ORDER BY updated_at DESC 
LIMIT 10;

-- 4. Check if user_analytics table exists and has data
SELECT 
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user_analytics') as table_exists,
  CASE 
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user_analytics') 
    THEN (SELECT COUNT(*) FROM user_analytics WHERE user_id = 'ac906d97-4edb-4c38-be04-e921987435cc')
    ELSE 0 
  END as user_records;

-- 5. Check if analysis_results table exists and has data
SELECT 
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'analysis_results') as table_exists,
  CASE 
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'analysis_results') 
    THEN (SELECT COUNT(*) FROM analysis_results WHERE user_id = 'ac906d97-4edb-4c38-be04-e921987435cc')
    ELSE 0 
  END as user_records;