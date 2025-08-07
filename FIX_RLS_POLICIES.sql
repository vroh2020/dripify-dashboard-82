-- Fix RLS policies for unrestricted tables
-- This will make the tables secure and remove "Unrestricted" status

BEGIN;

-- Enable RLS on the unrestricted tables
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_v2 ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own analytics" ON public.user_analytics;
DROP POLICY IF EXISTS "Users can insert their own analytics" ON public.user_analytics;
DROP POLICY IF EXISTS "Users can update their own analytics" ON public.user_analytics;

DROP POLICY IF EXISTS "Users can view their own analysis results" ON public.analysis_results;
DROP POLICY IF EXISTS "Users can insert their own analysis results" ON public.analysis_results;
DROP POLICY IF EXISTS "Users can update their own analysis results" ON public.analysis_results;

DROP POLICY IF EXISTS "Users can view their own onboarding data" ON public.onboarding_v2;
DROP POLICY IF EXISTS "Users can insert their own onboarding data" ON public.onboarding_v2;
DROP POLICY IF EXISTS "Users can update their own onboarding data" ON public.onboarding_v2;

-- Create proper RLS policies for user_analytics
CREATE POLICY "user_analytics_select_own" ON public.user_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_analytics_insert_own" ON public.user_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_analytics_update_own" ON public.user_analytics
    FOR UPDATE USING (auth.uid() = user_id);

-- Create proper RLS policies for analysis_results
CREATE POLICY "analysis_results_select_own" ON public.analysis_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "analysis_results_insert_own" ON public.analysis_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "analysis_results_update_own" ON public.analysis_results
    FOR UPDATE USING (auth.uid() = user_id);

-- Create proper RLS policies for onboarding_v2
CREATE POLICY "onboarding_v2_select_own" ON public.onboarding_v2
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "onboarding_v2_insert_own" ON public.onboarding_v2
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "onboarding_v2_update_own" ON public.onboarding_v2
    FOR UPDATE USING (auth.uid() = user_id);

-- Create analysis-images storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'analysis-images',
    'analysis-images',
    true,
    10485760, -- 10MB limit
    '{"image/jpeg","image/png","image/gif","image/webp"}'
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for analysis-images bucket
DROP POLICY IF EXISTS "Users can upload analysis images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view analysis images" ON storage.objects;

CREATE POLICY "Users can upload analysis images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'analysis-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view analysis images" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'analysis-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

COMMIT;