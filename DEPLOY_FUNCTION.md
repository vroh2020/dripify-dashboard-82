# How to Deploy the generate-outfits Function

## Option 1: Using Supabase CLI (Recommended)

### Step 1: Install Supabase CLI

**Windows (using Scoop):**
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Windows (using npm):**
```powershell
npm install -g supabase
```

**Or download directly:**
- Visit: https://github.com/supabase/cli/releases
- Download the Windows executable
- Add it to your PATH

### Step 2: Login to Supabase
```powershell
supabase login
```

### Step 3: Link to your project
```powershell
cd dripify-dashboard-82
supabase link --project-ref YOUR_PROJECT_REF
```

To find your project ref:
- Go to https://supabase.com/dashboard
- Select your project
- Go to Settings > API
- Copy the "Reference ID"

### Step 4: Deploy the function
```powershell
supabase functions deploy generate-outfits
```

---

## Option 2: Using Supabase Dashboard (Easier, No CLI needed)

### Step 1: Go to Supabase Dashboard
1. Visit: https://supabase.com/dashboard
2. Select your project

### Step 2: Navigate to Edge Functions
1. Click on "Edge Functions" in the left sidebar
2. Find "generate-outfits" in the list

### Step 3: Update the function
1. Click on "generate-outfits"
2. Click "Edit Function"
3. Copy the entire contents of `supabase/functions/generate-outfits/index.ts`
4. Paste it into the editor
5. Click "Deploy" or "Save"

---

## Option 3: Manual Upload via Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to "Edge Functions" > "Create a new function"
4. Name it: `generate-outfits`
5. Copy the code from `supabase/functions/generate-outfits/index.ts`
6. Paste and deploy

---

## Verify Deployment

After deploying, test it by:
1. Going to your app
2. Clicking "Outfit Generation" button
3. Entering a fit type (e.g., "casual")
4. It should work without CORS errors!

---

## Troubleshooting

If you get CORS errors:
- Make sure the function is deployed
- Check that CORS headers are in the function code
- Try clearing browser cache
- Check Supabase Dashboard > Edge Functions > Logs for errors

