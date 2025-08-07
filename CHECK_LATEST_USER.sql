-- Quick check for the most recent user session
-- Run this to see if your new user session is working

-- Get the most recent user_id that has activity
SELECT 
  user_id,
  'onboarding_v2' as source,
  step as activity,
  updated_at as last_activity
FROM onboarding_v2 
WHERE updated_at > NOW() - INTERVAL '30 minutes'

UNION ALL

SELECT 
  user_id,
  'user_analytics' as source,
  action as activity,
  timestamp as last_activity
FROM user_analytics 
WHERE timestamp > NOW() - INTERVAL '30 minutes'

ORDER BY last_activity DESC
LIMIT 10;

-- Check details for the most recent user
WITH latest_user AS (
  SELECT user_id 
  FROM onboarding_v2 
  WHERE updated_at > NOW() - INTERVAL '30 minutes'
  ORDER BY updated_at DESC 
  LIMIT 1
)
SELECT 
  'Onboarding Steps' as data_type,
  step,
  step_data,
  updated_at
FROM onboarding_v2 o
JOIN latest_user lu ON o.user_id = lu.user_id

UNION ALL

SELECT 
  'User Actions' as data_type,
  action,
  data::text,
  timestamp
FROM user_analytics ua
JOIN latest_user lu ON ua.user_id = lu.user_id

ORDER BY updated_at DESC;