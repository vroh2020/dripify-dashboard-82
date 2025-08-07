-- GET SPECIFIC USER DATA FOR: cbeda60d-70f6-4f95-926b-b9fceb70a6e1
-- This shows the detailed data for the user who just completed onboarding

-- ============================================================================
-- ONBOARDING DATA DETAILS
-- ============================================================================

SELECT 
    'ONBOARDING DATA' as data_type,
    user_id,
    current_step,
    step_data,
    updated_at
FROM onboarding_v2 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
ORDER BY updated_at DESC;

-- ============================================================================
-- ANALYTICS DATA DETAILS
-- ============================================================================

SELECT 
    'ANALYTICS DATA' as data_type,
    user_id,
    action,
    data,
    timestamp
FROM user_analytics 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
ORDER BY timestamp DESC;

-- ============================================================================
-- ANALYSIS RESULTS DETAILS
-- ============================================================================

SELECT 
    'ANALYSIS RESULTS' as data_type,
    user_id,
    score,
    image_url,
    analysis_data,
    created_at
FROM analysis_results 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
ORDER BY created_at DESC;

-- ============================================================================
-- ONBOARDING STEPS BREAKDOWN
-- ============================================================================

-- Check what onboarding steps were completed
SELECT 
    'ONBOARDING STEPS' as check_type,
    CASE 
        WHEN step_data->>'welcome_completed' IS NOT NULL 
        THEN '✅ Welcome completed' 
        ELSE '❌ Welcome not completed' 
    END as welcome_step,
    CASE 
        WHEN step_data->>'vibe_selected' IS NOT NULL 
        THEN '✅ Vibe selected' 
        ELSE '❌ Vibe not selected' 
    END as vibe_step,
    CASE 
        WHEN step_data->>'review_prompted' IS NOT NULL 
        THEN '✅ Review prompted' 
        ELSE '❌ Review not prompted' 
    END as review_step,
    CASE 
        WHEN step_data->>'how_it_works_completed' IS NOT NULL 
        THEN '✅ How it works completed' 
        ELSE '❌ How it works not completed' 
    END as how_it_works_step,
    CASE 
        WHEN step_data->>'photo_uploaded' IS NOT NULL 
        THEN '✅ Photo uploaded' 
        ELSE '❌ Photo not uploaded' 
    END as photo_step,
    CASE 
        WHEN step_data->>'analysis_completed' IS NOT NULL 
        THEN '✅ Analysis completed' 
        ELSE '❌ Analysis not completed' 
    END as analysis_step,
    CASE 
        WHEN step_data->>'teaser_viewed' IS NOT NULL 
        THEN '✅ Teaser viewed' 
        ELSE '❌ Teaser not viewed' 
    END as teaser_step
FROM onboarding_v2 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1';

-- ============================================================================
-- ANALYTICS ACTIONS BREAKDOWN
-- ============================================================================

-- Show all analytics actions in order
SELECT 
    action,
    data,
    timestamp,
    ROW_NUMBER() OVER (ORDER BY timestamp) as step_number
FROM user_analytics 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
ORDER BY timestamp;

-- ============================================================================
-- ANALYSIS SCORE DETAILS
-- ============================================================================

-- Show the analysis result details
SELECT 
    score,
    image_url,
    analysis_data,
    created_at
FROM analysis_results 
WHERE user_id = 'cbeda60d-70f6-4f95-926b-b9fceb70a6e1'
ORDER BY created_at DESC;
