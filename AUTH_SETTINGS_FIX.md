# Auth Settings Fix

## Remaining Issues to Fix in Supabase Dashboard

### 1. OTP Expiry Setting
**Current Issue:** OTP expiry is set to more than 1 hour
**Fix:**
1. Go to **Authentication > Settings** in Supabase Dashboard
2. Find **"OTP expiry"** setting
3. Change it to **30 minutes** or less (recommended: 30 minutes)
4. Click **Save**

### 2. Compromised Password Detection
**Current Issue:** Password checking against HaveIBeenPwned is disabled
**Fix:**
1. Go to **Authentication > Settings** in Supabase Dashboard  
2. Find **"Check for compromised passwords"** setting
3. **Enable** this feature
4. Click **Save**

## Summary
These are dashboard configuration changes that can't be done via SQL migration. Both settings enhance security:

- **Short OTP expiry**: Reduces window for OTP interception
- **Compromised password check**: Prevents users from using known compromised passwords

After making these changes, your Supabase Advisor should show significantly fewer warnings! 