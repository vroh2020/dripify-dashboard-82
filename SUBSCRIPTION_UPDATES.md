# Subscription Product Updates

## Overview
Updated the entire app to use the new Apple Store Connect product IDs and pricing structure.

## Changes Made

### Product Configuration
- **Removed**: `gs_1299_1m` ($12.99/month)
- **Added**: 
  - **Weekly**: `gs_499_1w` at $4.99/week (Apple ID: 6748323539)
  - **Monthly**: `gs_1099_1m` at $10.99/month (Apple ID: 6748885583)

### Files Updated

#### 1. RevenueCat Configuration
- `src/config/revenueCat.ts` - Updated product IDs

#### 2. Paywall Components
- `src/components/onboarding/steps/PaywallStep.tsx` - Added dual plan selection
- `src/components/Paywall.tsx` - Complete redesign with plan cards
- `src/components/onboarding/ProOfferCard.tsx` - Updated for new products

#### 3. iOS Configuration
- `ios/App/App/DripifyAI.storekit` - Updated to match Apple Store Connect

### Features Added
- ✅ Plan selection UI with weekly/monthly options
- ✅ Dynamic pricing from RevenueCat with fallbacks
- ✅ "POPULAR" badges and visual indicators
- ✅ Robust error handling for missing products
- ✅ Auto-updating button text based on selection

### Benefits
- Matches Apple Store Connect exactly (no more "Product not found")
- Lower entry point with weekly option for better conversion
- Monthly plan positioned as better value
- Consistent UI/UX across all paywall screens

### Branch Information
- **Base Branch**: `cursor/streamline-onboarding-and-fix-paywall-9e8e`
- **New Branch**: `feature/subscription-product-updates`
- **Status**: Ready for testing and deployment

## Testing Checklist
- [ ] Weekly subscription purchase flow
- [ ] Monthly subscription purchase flow  
- [ ] Fallback pricing when RevenueCat is unavailable
- [ ] Plan selection UI interactions
- [ ] Error handling for failed purchases
- [ ] Product restoration functionality