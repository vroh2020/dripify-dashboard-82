# Security Migration Testing Guide

## Pre-Migration Checklist

### 1. Backup Your Database
```bash
# If using Supabase CLI locally
npx supabase db dump --data-only > backup_data.sql

# Or create backup in Supabase Dashboard:
# Go to Settings > Database > Database Backups
```

### 2. Document Current State
```sql
-- Run these queries BEFORE migration to document current state

-- Check existing functions
SELECT routine_name, routine_type, security_type
FROM information_schema.routines 
WHERE routine_schema = 'public';

-- Check existing policies  
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public';

-- Check current streak counts
SELECT user_id, streak_count, created_at 
FROM style_analyses 
WHERE user_id IS NOT NULL 
ORDER BY user_id, created_at DESC;
```

## Migration Application

### Method 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase/migrations/20241201000000_security_fixes.sql`
4. Paste and execute the migration
5. Verify "Success" message appears

### Method 2: Using Supabase CLI (if Docker available)
```bash
# Apply migration
npx supabase db push

# Or apply specific migration
npx supabase migration up
```

## Post-Migration Validation

### 1. Verify Functions Were Created
```sql
-- Check all functions exist with correct security settings
SELECT 
    routine_name, 
    routine_type,
    security_type,
    specific_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('handle_new_user', 'update_updated_at_column', 'update_style_streak');

-- Expected result: 3 functions, all with security_type = 'DEFINER'
```

### 2. Verify Triggers Were Created
```sql
-- Check triggers exist
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Expected triggers:
-- - on_auth_user_created (on auth.users)
-- - update_*_updated_at (on all tables)  
-- - trigger_update_style_streak (on style_analyses)
```

### 3. Verify RLS Policies
```sql
-- Check RLS policies are properly configured
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Should see policies like:
-- profiles_select_own, profiles_insert_own, etc.
-- style_analyses_select_own, etc.
```

### 4. Verify Constraints Were Added
```sql
-- Check table constraints
SELECT 
    table_name, 
    constraint_name, 
    constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND constraint_type = 'CHECK'
ORDER BY table_name;

-- Should include:
-- check_username_length, check_username_format
-- check_streak_count_positive, check_total_score_range
```

### 5. Verify Indexes Were Created
```sql
-- Check indexes exist
SELECT 
    tablename, 
    indexname, 
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename;

-- Should include:
-- idx_style_analyses_user_id
-- idx_style_analyses_created_at  
-- idx_style_analyses_user_date
```

## Functional Testing

### 1. Test User Registration (handle_new_user function)
```javascript
// In your app or browser console
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'testpassword123'
});

// Then check if profile was created
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', data.user.id);

console.log('Profile created:', profile);
```

### 2. Test Streak Calculation (update_style_streak function)
```javascript
// Create a style analysis to test streak trigger
const { data, error } = await supabase
  .from('style_analyses')
  .insert({
    user_id: 'your-user-id',
    total_score: 85,
    feedback: 'Test analysis',
    breakdown: [{"category": "fit", "score": 85}],
    image_url: 'test-url'
  })
  .select();

console.log('Analysis with streak:', data);
// Should have streak_count = 1 for first analysis
```

### 3. Test RLS Policies
```javascript
// Test that user can only see their own data
const { data: ownAnalyses } = await supabase
  .from('style_analyses')
  .select('*');

console.log('Own analyses:', ownAnalyses.length);

// Try to access another user's data (should return empty)
const { data: otherAnalyses } = await supabase
  .from('style_analyses')
  .select('*')
  .eq('user_id', 'different-user-id');

console.log('Other user analyses:', otherAnalyses.length); // Should be 0
```

### 4. Test Updated_At Triggers
```javascript
// Update a profile to test updated_at trigger
const { data, error } = await supabase
  .from('profiles')
  .update({ username: 'newusername' })
  .eq('id', 'your-user-id')
  .select();

console.log('Updated profile:', data);
// updated_at should be current timestamp
```

## Performance Testing

### 1. Test Query Performance
```sql
-- Test user-specific queries use indexes
EXPLAIN ANALYZE 
SELECT * FROM style_analyses 
WHERE user_id = 'some-user-id'
ORDER BY created_at DESC;

-- Should show "Index Scan using idx_style_analyses_user_id"
```

### 2. Test Streak Query Performance  
```sql
-- Test streak calculation performance
EXPLAIN ANALYZE
SELECT user_id, DATE(created_at), streak_count
FROM style_analyses 
WHERE user_id = 'some-user-id'
ORDER BY created_at DESC;

-- Should use idx_style_analyses_user_date index
```

## Error Testing

### 1. Test Constraint Validation
```javascript
// Test username length constraint
try {
  await supabase
    .from('profiles')
    .update({ username: 'xy' }) // Too short
    .eq('id', 'user-id');
} catch (error) {
  console.log('Constraint error (expected):', error.message);
}

// Test score range constraint
try {
  await supabase
    .from('style_analyses')
    .insert({
      user_id: 'user-id',
      total_score: 150, // Invalid score
      feedback: 'test'
    });
} catch (error) {
  console.log('Score constraint error (expected):', error.message);
}
```

### 2. Test RLS Enforcement
```javascript
// Try to insert analysis for different user (should fail)
try {
  await supabase
    .from('style_analyses')
    .insert({
      user_id: 'different-user-id', // Different from auth.uid()
      total_score: 85,
      feedback: 'test'
    });
} catch (error) {
  console.log('RLS error (expected):', error.message);
}
```

## Security Audit Verification

### 1. Run Supabase Advisor
1. Go to Supabase Dashboard
2. Navigate to **Settings > General**
3. Scroll to **Advisor** section
4. Click "Run Advisor"
5. Verify all previous security warnings are resolved

### 2. Check Function Security
```sql
-- Verify all functions have secure search_path
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN ('handle_new_user', 'update_updated_at_column', 'update_style_streak');

-- Each function definition should contain "SET search_path = public"
```

## Rollback Plan (If Issues Found)

### 1. Immediate Rollback (if major issues)
```sql
-- Drop new triggers
DROP TRIGGER IF EXISTS trigger_update_style_streak ON public.style_analyses;

-- Drop new function
DROP FUNCTION IF EXISTS public.update_style_streak();

-- Restore basic policies (temporarily)
CREATE POLICY "temp_read_policy" ON public.profiles
    FOR SELECT USING (true); -- TEMPORARY ONLY!
```

### 2. Restore from Backup
```bash
# Restore data from backup
psql -h your-db-host -U postgres -d postgres < backup_data.sql
```

## Success Criteria

✅ **Migration Completed Successfully When:**
1. All 3 functions exist with `SECURITY DEFINER` and `SET search_path = public`
2. All triggers are active and functional
3. RLS policies properly restrict access to own data only
4. Constraints prevent invalid data entry
5. Indexes improve query performance
6. Supabase Advisor shows no security warnings
7. Application functionality remains intact
8. Streak calculations work automatically in database

## Troubleshooting Common Issues

### Issue: "Function already exists"
**Solution**: Migration uses `CREATE OR REPLACE`, this is normal

### Issue: "Column already exists"  
**Solution**: Migration uses `IF NOT EXISTS`, this is normal

### Issue: "Policy already exists"
**Solution**: Migration drops existing policies first, this is normal

### Issue: Streak counts are wrong
**Solution**: Run the data migration part again:
```sql
-- Re-run just the streak recalculation part
DO $$ 
-- ... (streak calculation code from migration)
$$;
```

### Issue: Application can't access data
**Solution**: Check RLS policies are correctly configured for authenticated users

Remember to test in a development environment first before applying to production! 