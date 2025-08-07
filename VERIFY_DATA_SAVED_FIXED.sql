-- VERIFY DATA SAVED AFTER RLS FIX (CORRECTED COLUMN NAMES)
-- Run these queries to check that data is being saved correctly

-- ============================================================================
-- PART 1: CHECK ONBOARDING_V2 DATA (CORRECTED)
-- ============================================================================

-- Check the most recent onboarding records
SELECT 
    user_id,
    current_step,
    step_data,
    created_at,
    updated_at
FROM onboarding_v2 
ORDER BY updated_at DESC 
LIMIT 10;

-- Check specific user's onboarding data (replace with actual user ID)
SELECT 
    user_id,
    current_step,
    step_data,
    created_at,
    updated_at
FROM onboarding_v2 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
ORDER BY updated_at DESC;

-- ============================================================================
-- PART 2: CHECK USER_ANALYTICS DATA
-- ============================================================================

-- Check the most recent analytics records
SELECT 
    user_id,
    action,
    data,
    timestamp,
    created_at
FROM user_analytics 
ORDER BY timestamp DESC 
LIMIT 15;

-- Check specific user's analytics (replace with actual user ID)
SELECT 
    user_id,
    action,
    data,
    timestamp
FROM user_analytics 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
ORDER BY timestamp DESC;

-- ============================================================================
-- PART 3: CHECK ANALYSIS_RESULTS DATA
-- ============================================================================

-- Check the most recent analysis results
SELECT 
    user_id,
    score,
    image_url,
    analysis_data,
    created_at
FROM analysis_results 
ORDER BY created_at DESC 
LIMIT 10;

-- Check specific user's analysis results (replace with actual user ID)
SELECT 
    user_id,
    score,
    image_url,
    analysis_data,
    created_at
FROM analysis_results 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
ORDER BY created_at DESC;

-- ============================================================================
-- PART 4: SUMMARY STATISTICS
-- ============================================================================

-- Count records in each table
SELECT 
    'onboarding_v2' as table_name,
    COUNT(*) as record_count,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(updated_at) as latest_update
FROM onboarding_v2
UNION ALL
SELECT 
    'user_analytics' as table_name,
    COUNT(*) as record_count,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(timestamp) as latest_update
FROM user_analytics
UNION ALL
SELECT 
    'analysis_results' as table_name,
    COUNT(*) as record_count,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(created_at) as latest_update
FROM analysis_results;

-- ============================================================================
-- PART 5: CHECK FOR RECENT ACTIVITY
-- ============================================================================

-- Check for activity in the last hour
SELECT 
    'onboarding_v2' as table_name,
    COUNT(*) as recent_records
FROM onboarding_v2 
WHERE updated_at >= NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 
    'user_analytics' as table_name,
    COUNT(*) as recent_records
FROM user_analytics 
WHERE timestamp >= NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 
    'analysis_results' as table_name,
    COUNT(*) as recent_records
FROM analysis_results 
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- ============================================================================
-- PART 6: VERIFY RLS POLICIES ARE WORKING
-- ============================================================================

-- Check current RLS policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd, 
    permissive
FROM pg_policies 
WHERE tablename IN ('onboarding_v2', 'user_analytics', 'analysis_results')
ORDER BY tablename, policyname;
