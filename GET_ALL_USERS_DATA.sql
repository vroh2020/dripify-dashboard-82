-- GET ALL USERS DATA ACROSS ALL TABLES
-- This shows comprehensive data for all users in the system

-- ============================================================================
-- ALL USERS SUMMARY
-- ============================================================================

-- Count all users in each table
SELECT 
    'ALL USERS SUMMARY' as data_type,
    'onboarding_v2' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(updated_at) as earliest_activity,
    MAX(updated_at) as latest_activity
FROM onboarding_v2
UNION ALL
SELECT 
    'ALL USERS SUMMARY' as data_type,
    'user_analytics' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(timestamp) as earliest_activity,
    MAX(timestamp) as latest_activity
FROM user_analytics
UNION ALL
SELECT 
    'ALL USERS SUMMARY' as data_type,
    'analysis_results' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(created_at) as earliest_activity,
    MAX(created_at) as latest_activity
FROM analysis_results;

-- ============================================================================
-- ALL ONBOARDING DATA
-- ============================================================================

-- Show all onboarding records
SELECT 
    'ALL ONBOARDING DATA' as data_type,
    user_id,
    current_step,
    step_data,
    updated_at
FROM onboarding_v2 
ORDER BY updated_at DESC;

-- ============================================================================
-- ALL ANALYTICS DATA
-- ============================================================================

-- Show all analytics records
SELECT 
    'ALL ANALYTICS DATA' as data_type,
    user_id,
    action,
    data,
    timestamp
FROM user_analytics 
ORDER BY timestamp DESC;

-- ============================================================================
-- ALL ANALYSIS RESULTS
-- ============================================================================

-- Show all analysis results
SELECT 
    'ALL ANALYSIS RESULTS' as data_type,
    user_id,
    score,
    image_url,
    analysis_data,
    created_at
FROM analysis_results 
ORDER BY created_at DESC;

-- ============================================================================
-- USER ACTIVITY BREAKDOWN
-- ============================================================================

-- Show activity by user
SELECT 
    'USER ACTIVITY' as data_type,
    user_id,
    COUNT(*) as total_actions,
    MIN(timestamp) as first_action,
    MAX(timestamp) as last_action,
    EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) as duration_seconds
FROM user_analytics 
GROUP BY user_id
ORDER BY total_actions DESC;

-- ============================================================================
-- RECENT ACTIVITY (LAST HOUR)
-- ============================================================================

-- Show recent activity
SELECT 
    'RECENT ACTIVITY' as data_type,
    'onboarding_v2' as table_name,
    COUNT(*) as recent_records
FROM onboarding_v2 
WHERE updated_at >= NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 
    'RECENT ACTIVITY' as data_type,
    'user_analytics' as table_name,
    COUNT(*) as recent_records
FROM user_analytics 
WHERE timestamp >= NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 
    'RECENT ACTIVITY' as data_type,
    'analysis_results' as table_name,
    COUNT(*) as recent_records
FROM analysis_results 
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- ============================================================================
-- TOP USERS BY ACTIVITY
-- ============================================================================

-- Show most active users
SELECT 
    'TOP USERS' as data_type,
    user_id,
    COUNT(*) as action_count,
    MAX(timestamp) as last_activity
FROM user_analytics 
GROUP BY user_id
ORDER BY action_count DESC
LIMIT 10;

-- ============================================================================
-- ANALYSIS SCORES DISTRIBUTION
-- ============================================================================

-- Show analysis score distribution
SELECT 
    'SCORE DISTRIBUTION' as data_type,
    CASE 
        WHEN score >= 90 THEN '90-100 (Excellent)'
        WHEN score >= 80 THEN '80-89 (Great)'
        WHEN score >= 70 THEN '70-79 (Good)'
        WHEN score >= 60 THEN '60-69 (Fair)'
        ELSE 'Below 60 (Poor)'
    END as score_range,
    COUNT(*) as count,
    AVG(score) as avg_score
FROM analysis_results 
GROUP BY 
    CASE 
        WHEN score >= 90 THEN '90-100 (Excellent)'
        WHEN score >= 80 THEN '80-89 (Great)'
        WHEN score >= 70 THEN '70-79 (Good)'
        WHEN score >= 60 THEN '60-69 (Fair)'
        ELSE 'Below 60 (Poor)'
    END
ORDER BY avg_score DESC;
