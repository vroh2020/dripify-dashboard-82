# Environment Setup Guide

## Required Environment Variables

### For Supabase Edge Functions

You need to set up the following environment variables in your Supabase project dashboard:

1. **Go to your Supabase Dashboard**
2. **Navigate to Edge Functions → Settings**
3. **Add these environment variables:**

#### NEBIUS_API_KEY
- **Purpose**: AI-powered style analysis
- **Where to get it**: [Nebius Cloud Console](https://console.nebius.com/)
- **Required for**: `analyze-style` function

#### REVENUECAT_SECRET_KEY (Optional)
- **Purpose**: Server-side subscription validation
- **Where to get it**: RevenueCat Dashboard → Project Settings → API Keys
- **Required for**: `revenuecat-config` function

### Setting Environment Variables

#### Option 1: Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Edge Functions → Settings
4. Add each environment variable

#### Option 2: Supabase CLI
```bash
supabase secrets set NEBIUS_API_KEY=your_actual_key_here
supabase secrets set REVENUECAT_SECRET_KEY=your_actual_key_here
```

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
- ❓ REVENUECAT_SECRET_KEY needs to be set

### Troubleshooting

If you see "API key not configured" errors:
1. Check that environment variables are set in Supabase dashboard
2. Redeploy functions after setting variables
3. Check function logs in Supabase dashboard 