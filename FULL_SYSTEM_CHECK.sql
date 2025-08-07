-- FULL SYSTEM CHECK - COMPREHENSIVE VERIFICATION
-- This checks all aspects of the system to ensure everything is working

-- ============================================================================
-- PART 1: DATABASE HEALTH CHECK
-- ============================================================================

-- Check all tables and their record counts
SELECT 
    'DATABASE HEALTH' as check_type,
    'onboarding_v2' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(updated_at) as latest_activity
FROM onboarding_v2
UNION ALL
SELECT 
    'DATABASE HEALTH' as check_type,
    'user_analytics' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(timestamp) as latest_activity
FROM user_analytics
UNION ALL
SELECT 
    'DATABASE HEALTH' as check_type,
    'analysis_results' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(created_at) as latest_activity
FROM analysis_results;

-- ============================================================================
-- PART 2: RLS POLICIES VERIFICATION
-- ============================================================================

-- Check current RLS policies
SELECT 
    'RLS POLICIES' as check_type,
    schemaname, 
    tablename, 
    policyname, 
    cmd, 
    permissive
FROM pg_policies 
WHERE tablename IN ('onboarding_v2', 'user_analytics', 'analysis_results')
ORDER BY tablename, policyname;

-- ============================================================================
-- PART 3: USER JOURNEY ANALYSIS
-- ============================================================================

-- Analyze user completion rates
SELECT 
    'USER JOURNEY ANALYSIS' as check_type,
    COUNT(*) as total_users,
    COUNT(CASE WHEN step_data->>'teaser_viewed' IS NOT NULL THEN 1 END) as completed_users,
    COUNT(CASE WHEN step_data->>'analysis_completed' IS NOT NULL THEN 1 END) as analysis_users,
    COUNT(CASE WHEN step_data->>'photo_uploaded' IS NOT NULL THEN 1 END) as photo_users,
    COUNT(CASE WHEN step_data->>'vibe_selected' IS NOT NULL THEN 1 END) as vibe_users,
    COUNT(CASE WHEN step_data->>'welcome_completed' IS NOT NULL THEN 1 END) as welcome_users,
    ROUND(
        (COUNT(CASE WHEN step_data->>'teaser_viewed' IS NOT NULL THEN 1 END)::float / COUNT(*)) * 100, 2
    ) as completion_rate_percent
FROM onboarding_v2;

-- ============================================================================
-- PART 4: ANALYTICS PERFORMANCE
-- ============================================================================

-- Check analytics tracking performance
SELECT 
    'ANALYTICS PERFORMANCE' as check_type,
    COUNT(*) as total_actions,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(DISTINCT action) as unique_actions,
    AVG(EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (ORDER BY timestamp)))) as avg_time_between_actions_seconds
FROM user_analytics;

-- ============================================================================
-- PART 5: AI ANALYSIS PERFORMANCE
-- ============================================================================

-- Check AI analysis performance
SELECT 
    'AI ANALYSIS PERFORMANCE' as check_type,
    COUNT(*) as total_analyses,
    AVG(score) as avg_score,
    MIN(score) as min_score,
    MAX(score) as max_score,
    COUNT(CASE WHEN score >= 90 THEN 1 END) as excellent_scores,
    COUNT(CASE WHEN score >= 80 THEN 1 END) as great_scores,
    COUNT(CASE WHEN score >= 70 THEN 1 END) as good_scores
FROM analysis_results;

-- ============================================================================
-- PART 6: RECENT ACTIVITY CHECK
-- ============================================================================

-- Check recent activity (last 24 hours)
SELECT 
    'RECENT ACTIVITY' as check_type,
    'onboarding_v2' as table_name,
    COUNT(*) as recent_records
FROM onboarding_v2 
WHERE updated_at >= NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
    'RECENT ACTIVITY' as check_type,
    'user_analytics' as table_name,
    COUNT(*) as recent_records
FROM user_analytics 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
    'RECENT ACTIVITY' as check_type,
    'analysis_results' as table_name,
    COUNT(*) as recent_records
FROM analysis_results 
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- ============================================================================
-- PART 7: SYSTEM STATUS SUMMARY
-- ============================================================================

-- Overall system status
SELECT 
    'SYSTEM STATUS' as check_type,
    CASE 
        WHEN (SELECT COUNT(*) FROM onboarding_v2) > 0 THEN '✅ DATABASE WORKING'
        ELSE '❌ DATABASE ISSUES'
    END as database_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('onboarding_v2', 'user_analytics', 'analysis_results')) >= 3 THEN '✅ RLS POLICIES ACTIVE'
        ELSE '❌ RLS POLICIES MISSING'
    END as rls_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM user_analytics) > 0 THEN '✅ ANALYTICS TRACKING'
        ELSE '❌ ANALYTICS ISSUES'
    END as analytics_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM analysis_results) > 0 THEN '✅ AI ANALYSIS WORKING'
        ELSE '❌ AI ANALYSIS ISSUES'
    END as ai_status;
