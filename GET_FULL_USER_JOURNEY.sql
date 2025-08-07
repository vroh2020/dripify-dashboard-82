-- GET FULL USER JOURNEY FOR: cbeda60d-70f6-4f95-926b-b9fceb70a6e1
-- This shows the complete onboarding journey with all steps and actions

-- ============================================================================
-- COMPLETE ONBOARDING DATA
-- ============================================================================

SELECT 
    'ONBOARDING COMPLETE DATA' as data_type,
    user_id,
    current_step,
    step_data,
    updated_at
FROM onboarding_v2 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1';

-- ============================================================================
-- ALL ANALYTICS ACTIONS IN CHRONOLOGICAL ORDER
-- ============================================================================

SELECT 
    'ANALYTICS TIMELINE' as data_type,
    action,
    data,
    timestamp,
    ROW_NUMBER() OVER (ORDER BY timestamp) as step_number
FROM user_analytics 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
ORDER BY timestamp;

-- ============================================================================
-- STEP-BY-STEP BREAKDOWN
-- ============================================================================

-- Show each onboarding step with its data
SELECT 
    'STEP BREAKDOWN' as data_type,
    'Welcome Step' as step_name,
    step_data->>'welcome_completed' as step_data,
    'Completed' as status
FROM onboarding_v2 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
UNION ALL
SELECT 
    'STEP BREAKDOWN' as data_type,
    'Vibe Selection' as step_name,
    step_data->>'vibe_selected' as step_data,
    CASE WHEN step_data->>'vibe_selected' IS NOT NULL THEN 'Completed' ELSE 'Not Completed' END as status
FROM onboarding_v2 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
UNION ALL
SELECT 
    'STEP BREAKDOWN' as data_type,
    'Review Prompt' as step_name,
    step_data->>'review_prompted' as step_data,
    CASE WHEN step_data->>'review_prompted' IS NOT NULL THEN 'Completed' ELSE 'Not Completed' END as status
FROM onboarding_v2 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
UNION ALL
SELECT 
    'STEP BREAKDOWN' as data_type,
    'How It Works' as step_name,
    step_data->>'how_it_works_completed' as step_data,
    CASE WHEN step_data->>'how_it_works_completed' IS NOT NULL THEN 'Completed' ELSE 'Not Completed' END as status
FROM onboarding_v2 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
UNION ALL
SELECT 
    'STEP BREAKDOWN' as data_type,
    'Photo Upload' as step_name,
    step_data->>'photo_uploaded' as step_data,
    CASE WHEN step_data->>'photo_uploaded' IS NOT NULL THEN 'Completed' ELSE 'Not Completed' END as status
FROM onboarding_v2 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
UNION ALL
SELECT 
    'STEP BREAKDOWN' as data_type,
    'Analysis' as step_name,
    step_data->>'analysis_completed' as step_data,
    CASE WHEN step_data->>'analysis_completed' IS NOT NULL THEN 'Completed' ELSE 'Not Completed' END as status
FROM onboarding_v2 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
UNION ALL
SELECT 
    'STEP BREAKDOWN' as data_type,
    'Teaser View' as step_name,
    step_data->>'teaser_viewed' as step_data,
    CASE WHEN step_data->>'teaser_viewed' IS NOT NULL THEN 'Completed' ELSE 'Not Completed' END as status
FROM onboarding_v2 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1';

-- ============================================================================
-- DETAILED ANALYTICS WITH TIMESTAMPS
-- ============================================================================

-- Show each analytics action with detailed data
SELECT 
    'ANALYTICS DETAILED' as data_type,
    action,
    data,
    timestamp,
    EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (ORDER BY timestamp))) as seconds_since_previous
FROM user_analytics 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
ORDER BY timestamp;

-- ============================================================================
-- ANALYSIS RESULT DETAILS
-- ============================================================================

SELECT 
    'ANALYSIS RESULT' as data_type,
    score,
    image_url,
    analysis_data,
    created_at
FROM analysis_results 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
ORDER BY created_at DESC;

-- ============================================================================
-- JOURNEY SUMMARY
-- ============================================================================

-- Summary of the complete journey
SELECT 
    'JOURNEY SUMMARY' as data_type,
    COUNT(*) as total_analytics_actions,
    MIN(timestamp) as journey_start,
    MAX(timestamp) as journey_end,
    EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) as total_duration_seconds,
    ROUND(EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 60, 2) as total_duration_minutes
FROM user_analytics 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1';
