# 🔍 Supabase Onboarding Data Inspector

## 📋 Quick Access Methods

### 1. **In-App Inspector** (Recommended)
Navigate to: `http://localhost:5173/inspector` 
- See all users and their onboarding progress
- Search specific users by ID
- View style analyses and photo uploads

### 2. **Supabase Dashboard SQL Queries**
Run these queries in your Supabase dashboard:

## 🔍 **SQL Queries for User Onboarding Data**

### 📊 **Get All Users Overview**
```sql
SELECT 
    id,
    username,
    age_range,
    main_goal,
    onboarding_completed,
    created_at,
    updated_at,
    CASE 
        WHEN onboarding_completed = true THEN 'Completed'
        WHEN age_range IS NOT NULL OR main_goal IS NOT NULL THEN 'In Progress'
        ELSE 'Not Started'
    END as status
FROM profiles 
ORDER BY created_at DESC;
```

### 👤 **Get Specific User Details**
```sql
-- Replace 'USER_ID_HERE' with actual user ID
SELECT 
    id,
    username,
    age_range as "Age Range",
    main_goal as "Main Goal",
    onboarding_completed as "Completed",
    created_at as "Joined",
    updated_at as "Last Updated"
FROM profiles 
WHERE id = 'USER_ID_HERE';
```

### 📸 **Get User's Photo Uploads & Analysis**
```sql
-- Replace 'USER_ID_HERE' with actual user ID
SELECT 
    sa.id,
    sa.total_score as "Score",
    sa.image_url as "Photo URL",
    sa.feedback as "AI Feedback",
    sa.scan_date as "Uploaded",
    sa.breakdown as "Detailed Analysis"
FROM style_analyses sa
WHERE sa.user_id = 'USER_ID_HERE'
ORDER BY sa.scan_date DESC;
```

### 📈 **Onboarding Completion Stats**
```sql
SELECT 
    COUNT(*) as "Total Users",
    COUNT(CASE WHEN onboarding_completed = true THEN 1 END) as "Completed",
    COUNT(CASE WHEN age_range IS NOT NULL THEN 1 END) as "Started Age",
    COUNT(CASE WHEN main_goal IS NOT NULL THEN 1 END) as "Started Goal",
    ROUND(
        COUNT(CASE WHEN onboarding_completed = true THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as "Completion Rate %"
FROM profiles;
```

### 🚫 **Find Incomplete Onboarding Users**
```sql
SELECT 
    id,
    username,
    age_range,
    main_goal,
    onboarding_completed,
    created_at,
    CASE 
        WHEN age_range IS NULL THEN 'Missing Age'
        WHEN main_goal IS NULL THEN 'Missing Goal'
        WHEN onboarding_completed = false THEN 'Not Completed'
        ELSE 'Unknown Issue'
    END as "Issue"
FROM profiles 
WHERE onboarding_completed != true
ORDER BY created_at DESC;
```

### 🔄 **Recent Activity (Last 24 Hours)**
```sql
SELECT 
    id,
    username,
    age_range,
    main_goal,
    onboarding_completed,
    updated_at
FROM profiles 
WHERE updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;
```

### 📊 **Answer Distribution**
```sql
-- See what users are selecting
SELECT 
    'Age Range' as "Question",
    age_range as "Answer",
    COUNT(*) as "Count"
FROM profiles 
WHERE age_range IS NOT NULL
GROUP BY age_range

UNION ALL

SELECT 
    'Main Goal' as "Question",
    main_goal as "Answer",
    COUNT(*) as "Count"
FROM profiles 
WHERE main_goal IS NOT NULL
GROUP BY main_goal

ORDER BY "Question", "Count" DESC;
```

## 🛠️ **Development Tools**

### Reset User Onboarding (for testing)
```sql
-- Replace 'USER_ID_HERE' with actual user ID
UPDATE profiles 
SET 
    age_range = NULL,
    main_goal = NULL,
    onboarding_completed = false,
    updated_at = NOW()
WHERE id = 'USER_ID_HERE';
```

### Create Test User Data
```sql
-- Insert test user (replace with real user ID from auth.users)
INSERT INTO profiles (id, username, age_range, main_goal, onboarding_completed)
VALUES (
    'test-user-123',
    'Test User',
    '25-34',
    'Professional Style',
    false
);
```

## 🎯 **Current Onboarding Issues to Track**

### ❌ **Problems We're Solving:**
1. **Missing Step Tracking** - We don't know which step user is on
2. **No Payment Status** - Can't tell if user paid but didn't complete
3. **No Photo Upload Status** - Don't know if photo was uploaded
4. **Completion Logic Bug** - Users completing without all requirements

### ✅ **What We Can Track Now:**
- User registration date
- Age range selection  
- Main goal selection
- Final completion status
- Style analysis results (when uploaded)
- Photo URLs (when analysis succeeds)

## 🚀 **Next Steps for Better Tracking**

Need to add these fields to `profiles` table:
- `current_step` - Track exactly where user is
- `payment_completed` - Separate payment tracking  
- `photo_uploaded` - Track photo upload status
- `step_timestamps` - When each step was completed

Would you like me to create the migration for these additional fields? 