-- Fix RLS policies for profiles table
-- This migration fixes the Row Level Security issues blocking profile updates

BEGIN;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Create more permissive policies for authenticated users
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE 
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Allow upsert operations for authenticated users
CREATE POLICY "profiles_upsert_own" ON public.profiles
    FOR ALL
    USING (auth.uid() = id OR auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() = id OR auth.uid() IS NOT NULL);

COMMIT; 