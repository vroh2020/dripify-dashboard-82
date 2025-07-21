# 🍎 RevenueCat iOS Debug & Setup Guide

## 🔍 **Issues Identified from Your Logs**

Based on your error logs, here are the exact problems and solutions:

### **Issue 1: Product Configuration Mismatch** ❌
```
Error fetching offerings - None of the products registered in the RevenueCat dashboard could be fetched from App Store Connect
```

**Root Cause**: Product ID `gs_1099_1m` was not referenced in your code

### **Issue 2: iOS Simulator Not Signed In** ❌
```
Error Domain=ASDErrorDomain Code=509 "No active account"
```

**Root Cause**: iOS Simulator needs Apple ID for StoreKit testing

### **Issue 3: Missing StoreKit Configuration** ❌
```
The receipt is missing - No such file or directory
```

**Root Cause**: No StoreKit configuration file for simulator testing

---

## ✅ **COMPLETE FIXES APPLIED**

### **Fix 1: Updated Product Configuration**
**File**: `src/config/revenueCat.ts`
```typescript
products: {
  monthly: 'gs_1099_1m', // ✅ Now matches your App Store Connect product ID
  yearly: 'yearly_pro'
}
```

### **Fix 2: Created StoreKit Configuration**
**File**: `ios/App/App/DripMax.storekit` (✅ Created)
- Contains your exact product: `gs_1099_1m`
- Matches subscription group: `21672094`
- Includes 7-day free trial configuration
- Uses your development team ID: `TN748MMP9M`

### **Fix 3: Enhanced Debug Logging**
**File**: `src/hooks/useRevenueCat.ts` (✅ Enhanced)
- Added comprehensive error logging
- Product ID verification
- Bundle ID validation
- API key status checking

---

## 🛠️ **SETUP STEPS FOR iOS SIMULATOR**

### **Step 1: Sign In to iOS Simulator**
```bash
# 1. Open iOS Simulator
# 2. Go to: Device → Sign In to Apple ID...
# 3. Use a test Apple ID (create at appleid.apple.com if needed)
# 4. This enables StoreKit sandbox testing
```

### **Step 2: Add StoreKit Configuration to Xcode**
```bash
# 1. Open: ios/App/App.xcworkspace in Xcode
# 2. Right-click on "App" folder in navigator
# 3. Choose "Add Files to App"
# 4. Select: ios/App/App/DripMax.storekit
# 5. Ensure "Add to target" is checked for "App"
```

### **Step 3: Configure Xcode Scheme**
```bash
# 1. In Xcode: Product → Scheme → Edit Scheme...
# 2. Select "Run" in left sidebar
# 3. Go to "Options" tab
# 4. Under "StoreKit Configuration" select "DripMax.storekit"
# 5. Click "Close"
```

### **Step 4: Set RevenueCat API Key**
```bash
# In Supabase Dashboard → Settings → Edge Functions → Environment Variables
# Add: REVENUECAT_PUBLIC_KEY = your_revenuecat_public_key_here
```

---

## 📊 **VERIFICATION CHECKLIST**

After applying fixes, run these checks:

### **Check 1: Product Configuration**
```javascript
// In browser console or app:
import { REVENUECAT_CONFIG } from './src/config/revenueCat';
console.log('Product ID:', REVENUECAT_CONFIG.products.monthly);
// Should show: "gs_1099_1m"
```

### **Check 2: Bundle ID Match**
```javascript
// Verify bundle IDs match across:
console.log('App Bundle:', 'com.genstyle.app');
console.log('ASC Bundle:', 'com.genstyle.app'); // Should match
console.log('RC Dashboard Bundle:', 'com.genstyle.app'); // Should match
```

### **Check 3: Debug Logs**
Look for these improved logs in your console:
```
🍎 RevenueCat Debug Info:
📱 Platform: ios
🔐 API Key found, initializing RevenueCat SDK...
🛒 Fetching RevenueCat offerings...
🔍 Looking for product ID: gs_1099_1m
🎯 Our product (gs_1099_1m) found: true
```

---

## 🔧 **REVENUEECAT DASHBOARD SETUP**

### **Required RevenueCat Configuration**
1. **Import Products from App Store Connect**:
   ```
   RevenueCat Dashboard → Your Project → Products → Import from App Store Connect
   ```

2. **Verify Product Import**:
   ```
   Product ID: gs_1099_1m ✅
   Bundle ID: com.genstyle.app ✅
   Status: Active ✅
   ```

3. **Create Offering**:
   ```
   RevenueCat Dashboard → Offerings → Create Offering
   Name: "Default Offering"
   Add Package: gs_1099_1m
   Set as Current Offering ✅
   ```

---

## 🚨 **COMMON ISSUES & SOLUTIONS**

### **Issue**: "No active account" in simulator
**Solution**: 
```bash
# iOS Simulator → Device → Sign In to Apple ID
# Use sandbox Apple ID for testing
```

### **Issue**: Products still not loading
**Solutions**:
1. **Check API Key**: Ensure `REVENUECAT_PUBLIC_KEY` is set in Supabase
2. **Verify Import**: Confirm products imported from App Store Connect to RevenueCat
3. **Bundle ID**: Ensure all bundle IDs match exactly
4. **Offering**: Ensure offering is marked as "Current" in RevenueCat dashboard

### **Issue**: StoreKit Configuration not working
**Solutions**:
1. **Add to Xcode**: Ensure `.storekit` file is added to Xcode project
2. **Scheme Config**: Set StoreKit configuration in scheme settings
3. **Clean Build**: Product → Clean Build Folder in Xcode

---

## 🧪 **TESTING WORKFLOW**

### **Test 1: Debug Logging**
```bash
# 1. Build and run app in simulator
# 2. Check console for debug logs with emojis
# 3. Verify product ID is found: 🎯 Our product (gs_1099_1m) found: true
```

### **Test 2: Offerings Fetch**
```bash
# 1. Navigate to paywall in app
# 2. Check console for offerings data
# 3. Verify no "Error fetching offerings" messages
```

### **Test 3: Purchase Flow**
```bash
# 1. Tap "Upgrade" button
# 2. Should show StoreKit purchase dialog
# 3. Test with sandbox Apple ID
```

---

## 📱 **DEVICE VS SIMULATOR DIFFERENCES**

### **Simulator Limitations**:
- Requires StoreKit configuration file
- Needs Apple ID sign-in
- Uses sandbox environment only

### **Physical Device**:
- Uses real App Store Connect configuration
- Requires TestFlight or development provisioning
- Can test production environment

---

## 🎯 **SUCCESS CRITERIA**

Your RevenueCat integration is working when you see:

```bash
✅ 🍎 RevenueCat Debug Info: Platform: ios
✅ 🔐 API Key found, initializing RevenueCat SDK...
✅ ✅ RevenueCat initialized successfully
✅ 🛒 Fetching offerings and subscription status...
✅ 🎯 Current offering found: [offering object]
✅ 🎯 Our product (gs_1099_1m) found: true
✅ ✅ Processed offerings count: 1
```

And NO errors like:
```bash
❌ Error fetching offerings
❌ No active account
❌ The receipt is missing
```

---

## 🚀 **NEXT STEPS**

1. **Apply fixes** (already done ✅)
2. **Set up iOS Simulator** with Apple ID
3. **Add StoreKit config** to Xcode project
4. **Set RevenueCat API key** in Supabase
5. **Test offerings fetch** in app
6. **Verify purchase flow** works

Your RevenueCat integration should now work perfectly! 🎉 

# Install Capacitor CLI
npm install -g @capacitor/cli

# Build for iOS in cloud
npx cap build ios --cloud 