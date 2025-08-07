-- Comprehensive Security Fixes Migration
-- This migration addresses ALL Supabase advisor warnings and security vulnerabilities

-- ============================================================================
-- 1. FIX SEARCH PATH VULNERABILITIES
-- ============================================================================

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    now(),
    now()
  );
  RETURN new;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create new update_style_streak function (was missing)
CREATE OR REPLACE FUNCTION public.update_style_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calculate streak based on consecutive days with analyses
  WITH streak_calc AS (
    SELECT 
      user_id,
      DATE(created_at) as analysis_date,
      ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn,
      DATE(created_at) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as grp
    FROM style_analyses
    WHERE user_id = NEW.user_id
  ),
  consecutive_days AS (
    SELECT 
      user_id,
      COUNT(*) as streak_count
    FROM streak_calc
    WHERE grp = (SELECT grp FROM streak_calc WHERE rn = 1)
    GROUP BY user_id, grp
  )
  UPDATE profiles 
  SET streak_count = COALESCE((SELECT streak_count FROM consecutive_days), 0)
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. SECURE ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_analyses ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON profiles;

-- Create secure profiles policies
CREATE POLICY "profiles_select_own" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Create secure style_analyses policies
CREATE POLICY "style_analyses_select_own" ON style_analyses
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "style_analyses_insert_own" ON style_analyses
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "style_analyses_update_own" ON style_analyses
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "style_analyses_delete_own" ON style_analyses
FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 3. ADD PERFORMANCE INDEXES
-- ============================================================================

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_style_analyses_user_id ON style_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_style_analyses_created_at ON style_analyses(created_at);
CREATE INDEX IF NOT EXISTS idx_style_analyses_user_created ON style_analyses(user_id, created_at DESC);

-- ============================================================================
-- 4. ADD DATA INTEGRITY CONSTRAINTS
-- ============================================================================

-- Add constraints to prevent invalid data
ALTER TABLE profiles 
ADD CONSTRAINT profiles_email_check 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE profiles 
ADD CONSTRAINT profiles_full_name_length 
CHECK (length(full_name) >= 1 AND length(full_name) <= 100);

ALTER TABLE style_analyses 
ADD CONSTRAINT style_analyses_overall_score_check 
CHECK (overall_score >= 0 AND overall_score <= 100);

-- ============================================================================
-- 5. ADD AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_style_analyses_updated_at
  BEFORE UPDATE ON style_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for streak calculation
CREATE TRIGGER update_style_streak_trigger
  AFTER INSERT ON style_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_style_streak();

-- ============================================================================
-- 6. CREATE USER TRIGGER
-- ============================================================================

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 7. SECURITY AUDIT LOG
-- ============================================================================

-- Create audit log table for security monitoring
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50),
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "audit_log_admin_only" ON security_audit_log
FOR ALL USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE email IN (
      'admin@dripmax.app',
      'support@dripmax.app'
    )
  )
);

-- ============================================================================
-- 8. FINAL SECURITY CHECKS
-- ============================================================================

-- Verify all tables have RLS enabled
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'pg_%'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.tablename);
  END LOOP;
END $$;

-- Log successful migration
INSERT INTO security_audit_log (action, table_name, new_values)
VALUES ('SECURITY_MIGRATION_COMPLETED', 'system', '{"version": "1.0", "timestamp": "' || now() || '"}'); 