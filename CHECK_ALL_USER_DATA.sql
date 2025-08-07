-- Check ALL data for this specific user
-- User: 17994a8c-61ac-446d-b9a2-ef3f436891f4

-- 1. All onboarding steps
SELECT 
  'ONBOARDING' as table_name,
  step as action,
  step_data as data,
  updated_at as timestamp
FROM public.onboarding_v2 
WHERE user_id = '17994a8c-61ac-446d-b9a2-ef3f436891f4'

UNION ALL

-- 2. All user actions
SELECT 
  'ANALYTICS' as table_name,
  action,
  data,
  timestamp
FROM public.user_analytics 
WHERE user_id = '17994a8c-61ac-446d-b9a2-ef3f436891f4'

UNION ALL

-- 3. All analysis results
SELECT 
  'ANALYSIS' as table_name,
  'analysis_result' as action,
  analysis_data as data,
  created_at as timestamp
FROM public.analysis_results 
WHERE user_id = '17994a8c-61ac-446d-b9a2-ef3f436891f4'

ORDER BY timestamp ASC;

-- Also check what's in user_analytics table
SELECT * FROM public.user_analytics 
WHERE user_id = '17994a8c-61ac-446d-b9a2-ef3f436891f4'
ORDER BY timestamp ASC;