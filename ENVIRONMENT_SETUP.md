# Environment Setup Guide

## Required Environment Variables

### 1. For Client-Side (.env file)

Create a `.env` file in your project root with:

```bash
# RevenueCat Configuration (Optional - Development Mode if empty)
VITE_REVENUECAT_PUBLIC_KEY=your_revenuecat_public_key_here

# Note: If this is empty, the app will run in development mode with Pro features enabled for testing
```

### 2. For Supabase Edge Functions

You need to set up the following environment variables in your Supabase project dashboard:

1. **Go to your Supabase Dashboard**
2. **Navigate to Edge Functions → Settings**
3. **Add these environment variables:**

#### NEBIUS_API_KEY
- **Purpose**: AI-powered style analysis
- **Where to get it**: [Nebius Cloud Console](https://console.nebius.com/)
- **Required for**: `analyze-style` function

#### REVENUECAT_PUBLIC_API_KEY (Optional)
- **Purpose**: Server-side subscription validation
- **Where to get it**: RevenueCat Dashboard → Project Settings → API Keys → Public App-Specific Key
- **Required for**: `revenuecat-config` function

### Getting Your RevenueCat API Key

1. **Sign up at RevenueCat**: https://app.revenuecat.com/
2. **Create a new project** for your app
3. **Go to Project Settings → API Keys**
4. **Copy the "Public App-Specific Key"** (not the secret key!)
5. **Add it to your .env file**: `VITE_REVENUECAT_PUBLIC_KEY=rcat_xxx...`

### Setting Environment Variables

#### Option 1: Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Edge Functions → Settings
4. Add each environment variable

#### Option 2: Supabase CLI
```bash
supabase secrets set NEBIUS_API_KEY=your_actual_key_here
supabase secrets set REVENUECAT_PUBLIC_API_KEY=your_actual_key_here
```

### Development Mode vs Production

- **Without RevenueCat API Key**: App runs in development mode with Pro features enabled
- **With RevenueCat API Key**: App uses real subscription system

This allows you to develop and test without setting up RevenueCat immediately.

### Testing Your Setup

Once you've set the environment variables, test the functions:

```bash
# Deploy functions
supabase functions deploy

# Test the style analysis function
curl -X POST 'https://jjqwhxamjxsiotnhhqco.supabase.co/functions/v1/analyze-style' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"image": "data:image/jpeg;base64,...", "style": "casual"}'
```

### Current Status

- ✅ Supabase project configured
- ❓ NEBIUS_API_KEY needs to be set
- ❓ REVENUECAT_PUBLIC_API_KEY needs to be set (optional)
- ✅ Development mode fallback working

### Troubleshooting

If you see "API key not configured" errors:
1. Check that environment variables are set in Supabase dashboard
2. Redeploy functions after setting variables
3. Check function logs in Supabase dashboard
4. For RevenueCat issues, check if you're in development mode

### Quick Start (No Configuration)

The app will work immediately in development mode:
1. All Pro features are enabled for testing
2. No RevenueCat setup required
3. AI analysis requires NEBIUS_API_KEY for real analysis, otherwise uses mock data 