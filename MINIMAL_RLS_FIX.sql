-- MINIMAL RLS FIX - Add anonymous user support to existing policies

-- Add anonymous user support to onboarding_v2 (for onboarding data)
CREATE POLICY "Allow anonymous onboarding insert" ON public.onboarding_v2
FOR INSERT WITH CHECK (auth.uid() IS NULL);

-- Add anonymous user support to user_analytics (for tracking)
CREATE POLICY "Allow anonymous analytics insert" ON public.user_analytics
FOR INSERT WITH CHECK (auth.uid() IS NULL);

-- Add anonymous user support to analysis_results (for analysis data)
CREATE POLICY "Allow anonymous analysis insert" ON public.analysis_results
FOR INSERT WITH CHECK (auth.uid() IS NULL);

-- Add anonymous user support to profiles (for profile creation)
CREATE POLICY "Allow anonymous profile insert" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() IS NULL);
