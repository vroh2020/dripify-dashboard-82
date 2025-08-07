-- GET COMPLETE USER DATA IN ONE ROW
-- This shows all onboarding data for each user in a single row

-- ============================================================================
-- COMPLETE USER DATA - ALL STEPS IN ONE ROW
-- ============================================================================

SELECT 
    'COMPLETE USER DATA' as data_type,
    user_id,
    current_step,
    updated_at,
    -- Welcome Step
    step_data->>'welcome_completed' as welcome_data,
    -- Vibe Selection
    step_data->>'vibe_selected' as vibe_data,
    -- Review Prompt
    step_data->>'review_prompted' as review_data,
    -- How It Works
    step_data->>'how_it_works_completed' as how_it_works_data,
    -- Photo Upload
    step_data->>'photo_uploaded' as photo_data,
    -- Analysis
    step_data->>'analysis_completed' as analysis_data,
    -- Teaser View
    step_data->>'teaser_viewed' as teaser_data,
    -- Complete step_data JSON
    step_data
FROM onboarding_v2 
ORDER BY updated_at DESC;

-- ============================================================================
-- USER PROGRESS SUMMARY
-- ============================================================================

SELECT 
    'USER PROGRESS SUMMARY' as data_type,
    user_id,
    current_step,
    updated_at,
    -- Step completion status
    CASE WHEN step_data->>'welcome_completed' IS NOT NULL THEN '✅' ELSE '❌' END as welcome,
    CASE WHEN step_data->>'vibe_selected' IS NOT NULL THEN '✅' ELSE '❌' END as vibe,
    CASE WHEN step_data->>'review_prompted' IS NOT NULL THEN '✅' ELSE '❌' END as review,
    CASE WHEN step_data->>'how_it_works_completed' IS NOT NULL THEN '✅' ELSE '❌' END as how_it_works,
    CASE WHEN step_data->>'photo_uploaded' IS NOT NULL THEN '✅' ELSE '❌' END as photo,
    CASE WHEN step_data->>'analysis_completed' IS NOT NULL THEN '✅' ELSE '❌' END as analysis,
    CASE WHEN step_data->>'teaser_viewed' IS NOT NULL THEN '✅' ELSE '❌' END as teaser,
    -- Completion percentage
    CASE 
        WHEN step_data->>'teaser_viewed' IS NOT NULL THEN '100% COMPLETED'
        WHEN step_data->>'analysis_completed' IS NOT NULL THEN '85% - ANALYSIS DONE'
        WHEN step_data->>'photo_uploaded' IS NOT NULL THEN '71% - PHOTO UPLOADED'
        WHEN step_data->>'how_it_works_completed' IS NOT NULL THEN '57% - HOW IT WORKS DONE'
        WHEN step_data->>'review_prompted' IS NOT NULL THEN '42% - REVIEW PROMPTED'
        WHEN step_data->>'vibe_selected' IS NOT NULL THEN '28% - VIBE SELECTED'
        WHEN step_data->>'welcome_completed' IS NOT NULL THEN '14% - WELCOME DONE'
        ELSE '0% - STARTED'
    END as progress_status
FROM onboarding_v2 
ORDER BY updated_at DESC;

-- ============================================================================
-- DETAILED USER DATA WITH ALL INFO
-- ============================================================================

SELECT 
    'DETAILED USER DATA' as data_type,
    user_id,
    current_step,
    updated_at,
    -- Welcome data
    CASE 
        WHEN step_data->>'welcome_completed' IS NOT NULL 
        THEN CONCAT('Welcome completed at ', updated_at::text)
        ELSE 'Welcome not completed'
    END as welcome_status,
    -- Vibe selection
    CASE 
        WHEN step_data->>'vibe_selected' IS NOT NULL 
        THEN CONCAT('Vibe: ', step_data->>'vibe_selected')
        ELSE 'No vibe selected'
    END as vibe_status,
    -- Review prompt
    CASE 
        WHEN step_data->>'review_prompted' IS NOT NULL 
        THEN CONCAT('Review: ', step_data->>'review_prompted')
        ELSE 'Review not prompted'
    END as review_status,
    -- How it works
    CASE 
        WHEN step_data->>'how_it_works_completed' IS NOT NULL 
        THEN 'How it works completed'
        ELSE 'How it works not completed'
    END as how_it_works_status,
    -- Photo upload
    CASE 
        WHEN step_data->>'photo_uploaded' IS NOT NULL 
        THEN CONCAT('Photo: ', step_data->>'photo_uploaded')
        ELSE 'No photo uploaded'
    END as photo_status,
    -- Analysis
    CASE 
        WHEN step_data->>'analysis_completed' IS NOT NULL 
        THEN CONCAT('Analysis: ', step_data->>'analysis_completed')
        ELSE 'Analysis not completed'
    END as analysis_status,
    -- Teaser
    CASE 
        WHEN step_data->>'teaser_viewed' IS NOT NULL 
        THEN CONCAT('Teaser: ', step_data->>'teaser_viewed')
        ELSE 'Teaser not viewed'
    END as teaser_status
FROM onboarding_v2 
ORDER BY updated_at DESC;
