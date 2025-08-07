-- GET ONBOARDING STEPS DATA FOR ALL USERS
-- This shows the actual step data and progress for each user

-- ============================================================================
-- ALL ONBOARDING RECORDS WITH STEP DATA
-- ============================================================================

SELECT 
    'ONBOARDING STEPS' as data_type,
    user_id,
    current_step,
    step_data,
    updated_at
FROM onboarding_v2 
ORDER BY updated_at DESC;

-- ============================================================================
-- STEP-BY-STEP BREAKDOWN FOR EACH USER
-- ============================================================================

-- Show each user's onboarding progress
SELECT 
    'USER ONBOARDING PROGRESS' as data_type,
    user_id,
    current_step,
    CASE 
        WHEN step_data->>'welcome_completed' IS NOT NULL THEN '✅'
        ELSE '❌'
    END as welcome_completed,
    CASE 
        WHEN step_data->>'vibe_selected' IS NOT NULL THEN '✅'
        ELSE '❌'
    END as vibe_selected,
    CASE 
        WHEN step_data->>'review_prompted' IS NOT NULL THEN '✅'
        ELSE '❌'
    END as review_prompted,
    CASE 
        WHEN step_data->>'how_it_works_completed' IS NOT NULL THEN '✅'
        ELSE '❌'
    END as how_it_works_completed,
    CASE 
        WHEN step_data->>'photo_uploaded' IS NOT NULL THEN '✅'
        ELSE '❌'
    END as photo_uploaded,
    CASE 
        WHEN step_data->>'analysis_completed' IS NOT NULL THEN '✅'
        ELSE '❌'
    END as analysis_completed,
    CASE 
        WHEN step_data->>'teaser_viewed' IS NOT NULL THEN '✅'
        ELSE '❌'
    END as teaser_viewed,
    updated_at
FROM onboarding_v2 
ORDER BY updated_at DESC;

-- ============================================================================
-- DETAILED STEP DATA FOR EACH USER
-- ============================================================================

-- Show the actual data for each step
SELECT 
    'DETAILED STEP DATA' as data_type,
    user_id,
    'Welcome' as step_name,
    step_data->>'welcome_completed' as step_data,
    updated_at
FROM onboarding_v2 
WHERE step_data->>'welcome_completed' IS NOT NULL
UNION ALL
SELECT 
    'DETAILED STEP DATA' as data_type,
    user_id,
    'Vibe Selection' as step_name,
    step_data->>'vibe_selected' as step_data,
    updated_at
FROM onboarding_v2 
WHERE step_data->>'vibe_selected' IS NOT NULL
UNION ALL
SELECT 
    'DETAILED STEP DATA' as data_type,
    user_id,
    'Review Prompt' as step_name,
    step_data->>'review_prompted' as step_data,
    updated_at
FROM onboarding_v2 
WHERE step_data->>'review_prompted' IS NOT NULL
UNION ALL
SELECT 
    'DETAILED STEP DATA' as data_type,
    user_id,
    'How It Works' as step_name,
    step_data->>'how_it_works_completed' as step_data,
    updated_at
FROM onboarding_v2 
WHERE step_data->>'how_it_works_completed' IS NOT NULL
UNION ALL
SELECT 
    'DETAILED STEP DATA' as data_type,
    user_id,
    'Photo Upload' as step_name,
    step_data->>'photo_uploaded' as step_data,
    updated_at
FROM onboarding_v2 
WHERE step_data->>'photo_uploaded' IS NOT NULL
UNION ALL
SELECT 
    'DETAILED STEP DATA' as data_type,
    user_id,
    'Analysis' as step_name,
    step_data->>'analysis_completed' as step_data,
    updated_at
FROM onboarding_v2 
WHERE step_data->>'analysis_completed' IS NOT NULL
UNION ALL
SELECT 
    'DETAILED STEP DATA' as data_type,
    user_id,
    'Teaser View' as step_name,
    step_data->>'teaser_viewed' as step_data,
    updated_at
FROM onboarding_v2 
WHERE step_data->>'teaser_viewed' IS NOT NULL
ORDER BY updated_at DESC;

-- ============================================================================
-- COMPLETION STATUS BY USER
-- ============================================================================

-- Show completion status for each user
SELECT 
    'COMPLETION STATUS' as data_type,
    user_id,
    current_step,
    CASE 
        WHEN step_data->>'teaser_viewed' IS NOT NULL THEN 'COMPLETED'
        WHEN step_data->>'analysis_completed' IS NOT NULL THEN 'ANALYSIS DONE'
        WHEN step_data->>'photo_uploaded' IS NOT NULL THEN 'PHOTO UPLOADED'
        WHEN step_data->>'how_it_works_completed' IS NOT NULL THEN 'HOW IT WORKS DONE'
        WHEN step_data->>'review_prompted' IS NOT NULL THEN 'REVIEW PROMPTED'
        WHEN step_data->>'vibe_selected' IS NOT NULL THEN 'VIBE SELECTED'
        WHEN step_data->>'welcome_completed' IS NOT NULL THEN 'WELCOME DONE'
        ELSE 'STARTED'
    END as completion_status,
    updated_at
FROM onboarding_v2 
ORDER BY updated_at DESC;

-- ============================================================================
-- VIBE SELECTIONS
-- ============================================================================

-- Show what vibes users selected
SELECT 
    'VIBE SELECTIONS' as data_type,
    user_id,
    step_data->>'vibe_selected' as selected_vibe,
    updated_at
FROM onboarding_v2 
WHERE step_data->>'vibe_selected' IS NOT NULL
ORDER BY updated_at DESC;

-- ============================================================================
-- PHOTO UPLOAD DATA
-- ============================================================================

-- Show photo upload information
SELECT 
    'PHOTO UPLOADS' as data_type,
    user_id,
    step_data->>'photo_uploaded' as photo_data,
    updated_at
FROM onboarding_v2 
WHERE step_data->>'photo_uploaded' IS NOT NULL
ORDER BY updated_at DESC;

-- ============================================================================
-- ANALYSIS COMPLETION DATA
-- ============================================================================

-- Show analysis completion data
SELECT 
    'ANALYSIS COMPLETIONS' as data_type,
    user_id,
    step_data->>'analysis_completed' as analysis_data,
    updated_at
FROM onboarding_v2 
WHERE step_data->>'analysis_completed' IS NOT NULL
ORDER BY updated_at DESC;
