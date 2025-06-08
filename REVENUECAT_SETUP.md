# RevenueCat Setup Instructions

## Required Environment Variables in Supabase

To complete your RevenueCat integration, you need to add your RevenueCat API key to Supabase secrets:

### 1. Add RevenueCat API Key to Supabase

```bash
# Add your RevenueCat public API key
npx supabase secrets set REVENUECAT_PUBLIC_API_KEY=your_revenuecat_public_key_here
```

### 2. Get Your RevenueCat API Key

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Navigate to your project
3. Go to **Project Settings** → **API Keys**
4. Copy your **Public Key** (starts with "appl_" for iOS or "goog_" for Android)

### 3. Important Notes

- **Use the PUBLIC key, not the secret key** for client-side integration
- The public key is safe to use in client applications
- Your Edge Function at `supabase/functions/revenuecat-config/index.ts` will serve this key to your app
- Without this key, RevenueCat will run in development mode (free access for testing)

### 4. Testing

After setting the key, test that it works:

```bash
# Test your Edge Function
npx supabase functions invoke revenuecat-config
```

You should see a response with your public key.

### 5. Development vs Production

- **Development**: If no key is set, the app automatically grants Pro access for testing
- **Production**: The API key is required for real purchases and subscription management

## Current Integration Status

✅ RevenueCat SDK properly configured
✅ Edge Functions for secure API key management  
✅ Proper separation of restore vs purchase flows
✅ Onboarding paywall with restore option
✅ Profile page restore functionality

## What Changed

1. **Fixed Restore Purchases**: Now only restores existing purchases, doesn't trigger subscription prompts
2. **Enhanced Onboarding Paywall**: Added restore purchases button to the onboarding flow
3. **Better Error Handling**: More specific error messages and user feedback
4. **Separated Concerns**: Restore and purchase flows are now completely separate 