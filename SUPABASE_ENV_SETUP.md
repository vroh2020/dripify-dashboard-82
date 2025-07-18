# Supabase Environment Setup Guide

## Error Fix: Missing VITE_SUPABASE_URL environment variable

This error occurs when the required Supabase environment variables are not configured. Follow these steps to fix it:

### Quick Fix

1. The `.env` file has been created with the Supabase URL already configured:
   ```
   VITE_SUPABASE_URL=https://jjqwhxamjxsiotnhhqco.supabase.co
   ```

2. You need to add the Supabase anon key:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard/project/jjqwhxamjxsiotnhhqco/settings/api)
   - Sign in with your Supabase account
   - Navigate to Settings → API
   - Copy the `anon public` key
   - Replace `YOUR_SUPABASE_ANON_KEY_HERE` in the `.env` file with your actual key

3. Restart your development server:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   bun dev
   ```

### Complete .env Example

Your `.env` file should look like this:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://jjqwhxamjxsiotnhhqco.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# RevenueCat Configuration (Optional)
VITE_REVENUECAT_PUBLIC_KEY=
```

### Important Notes

- The anon key is safe to use in client-side applications
- Never commit the `.env` file to version control (it's already in `.gitignore`)
- The Supabase URL format must be: `https://[PROJECT_ID].supabase.co`
- Both environment variables are required for the app to work

### Troubleshooting

If you still see the error after adding the environment variables:
1. Make sure the `.env` file is in the root directory of your project
2. Check that there are no typos in the variable names
3. Ensure there are no spaces around the `=` sign
4. Clear your browser cache and restart the development server
5. If using a deployment platform, make sure to add these environment variables in your deployment settings

### For Deployment

When deploying to platforms like Vercel, Netlify, or others:
1. Add these environment variables in your deployment platform's settings
2. Use the same variable names: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Redeploy your application after adding the variables