-- CHECK SPECIFIC USER DATA
-- This checks the data for the user who just completed onboarding

-- Replace this user ID with the actual user ID from your logs
-- Current user ID: cbeda60d-70f6-4f95-926b-b9fceb70a6e1

-- ============================================================================
-- QUICK SUMMARY FOR USER
-- ============================================================================

-- Check if user exists in all tables
SELECT 
    'onboarding_v2' as table_name,
    COUNT(*) as record_count,
    MAX(updated_at) as last_activity
FROM onboarding_v2 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
UNION ALL
SELECT 
    'user_analytics' as table_name,
    COUNT(*) as record_count,
    MAX(timestamp) as last_activity
FROM user_analytics 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
UNION ALL
SELECT 
    'analysis_results' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_activity
FROM analysis_results 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1';

-- ============================================================================
-- DETAILED USER DATA
-- ============================================================================

-- User's onboarding progress
SELECT 
    'ONBOARDING DATA' as data_type,
    current_step,
    onboarding_data,
    updated_at
FROM onboarding_v2 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
ORDER BY updated_at DESC;

-- User's analytics actions
SELECT 
    'ANALYTICS DATA' as data_type,
    action,
    metadata,
    timestamp
FROM user_analytics 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
ORDER BY timestamp DESC;

-- User's analysis results
SELECT 
    'ANALYSIS DATA' as data_type,
    score,
    image_url,
    created_at
FROM analysis_results 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
ORDER BY created_at DESC;

-- ============================================================================
-- VERIFY ONBOARDING STEPS COMPLETED
-- ============================================================================

-- Check which onboarding steps were completed
SELECT 
    'ONBOARDING STEPS' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM onboarding_v2 WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1' AND onboarding_data->>'welcome_completed' IS NOT NULL) 
        THEN '✅ Welcome completed' 
        ELSE '❌ Welcome not completed' 
    END as welcome_step,
    CASE 
        WHEN EXISTS (SELECT 1 FROM onboarding_v2 WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1' AND onboarding_data->>'vibe_selected' IS NOT NULL) 
        THEN '✅ Vibe selected' 
        ELSE '❌ Vibe not selected' 
    END as vibe_step,
    CASE 
        WHEN EXISTS (SELECT 1 FROM onboarding_v2 WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1' AND onboarding_data->>'photo_uploaded' IS NOT NULL) 
        THEN '✅ Photo uploaded' 
        ELSE '❌ Photo not uploaded' 
    END as photo_step,
    CASE 
        WHEN EXISTS (SELECT 1 FROM onboarding_v2 WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1' AND onboarding_data->>'analysis_completed' IS NOT NULL) 
        THEN '✅ Analysis completed' 
        ELSE '❌ Analysis not completed' 
    END as analysis_step,
    CASE 
        WHEN EXISTS (SELECT 1 FROM onboarding_v2 WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1' AND onboarding_data->>'teaser_viewed' IS NOT NULL) 
        THEN '✅ Teaser viewed' 
        ELSE '❌ Teaser not viewed' 
    END as teaser_step; 