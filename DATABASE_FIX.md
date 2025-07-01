# 🚨 Database Fix: Users Marked Complete But Never Paid

## 🔍 **Find Problem Users**

Run this in your **Supabase Dashboard** → SQL Editor:

```sql
-- Find users marked as completed but likely never paid
SELECT 
    id,
    username,
    age_range,
    main_goal,
    onboarding_completed,
    created_at,
    updated_at,
    'PROBLEM: Marked complete but likely no payment' as issue
FROM profiles 
WHERE onboarding_completed = true
ORDER BY created_at DESC;
```

## 🔧 **Fix the Problem Users**

### **Option 1: Reset ALL Suspicious Users (Safest)**
```sql
-- Reset onboarding for users who completed recently but likely didn't pay
UPDATE profiles 
SET 
    onboarding_completed = false,
    updated_at = NOW()
WHERE onboarding_completed = true
  AND created_at > '2025-06-25'; -- Adjust date as needed

-- Check how many were updated
SELECT COUNT(*) as "Users Reset" FROM profiles WHERE onboarding_completed = false;
```

### **Option 2: Reset Specific User (Your Test User)**
```sql
-- Replace 'USER_ID_HERE' with the actual user ID
UPDATE profiles 
SET 
    onboarding_completed = false,
    updated_at = NOW()
WHERE id = 'USER_ID_HERE';
```

### **Option 3: Smart Reset (Keep Real Subscribers)**
```sql
-- Only reset users who completed very recently (likely test users)
UPDATE profiles 
SET 
    onboarding_completed = false,
    updated_at = NOW()
WHERE onboarding_completed = true
  AND updated_at > NOW() - INTERVAL '24 hours';  -- Last 24 hours only
```

## ✅ **Verify the Fix**

After running the update, check:

```sql
-- Should show fewer "completed" users now
SELECT 
    COUNT(CASE WHEN onboarding_completed = true THEN 1 END) as "Completed Users",
    COUNT(CASE WHEN onboarding_completed = false THEN 1 END) as "Incomplete Users",
    COUNT(*) as "Total Users"
FROM profiles;
```

## 🎯 **What This Fix Does:**

1. **✅ Resets fake completions** - Users marked complete without payment
2. **✅ Forces proper flow** - They'll go through payment again  
3. **✅ Prevents dashboard access** - Until they actually pay
4. **✅ Preserves real data** - Keeps age_range and main_goal answers

## 🔄 **New Logic Applied:**

The updated `useOnboardingStatus.ts` now checks:
- ✅ **Database flag**: `onboarding_completed = true`
- ✅ **User answers**: Has `age_range` and `main_goal`  
- ✅ **Subscription status**: `isPro = true` from RevenueCat
- ✅ **Auto-reset**: If marked complete but no Pro access

## 🚀 **Test the Fix:**

1. **Run the SQL** to reset problem users
2. **Refresh your app** 
3. **Try logging in** with the test email
4. **Should go to onboarding** instead of dashboard
5. **Watch console logs** for the new completion checks

Your returning user should now go through the **payment flow properly**! 🎯 