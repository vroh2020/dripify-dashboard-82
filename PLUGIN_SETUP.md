# Background Removal Plugin Setup & Testing Guide

## ✅ Step 1: Verify Plugin Files Are in Xcode

1. **Open your Xcode project:**
   ```bash
   cd dripify-dashboard-82/ios/App
   open App.xcworkspace
   ```

2. **Check if plugin files are in the project:**
   - In Xcode, look for `BackgroundRemovalPlugin.swift` and `BackgroundRemovalPlugin.m` in the file navigator
   - They should be in the `App` folder/target

3. **If files are missing from Xcode:**
   - Right-click on the `App` folder in Xcode
   - Select "Add Files to App..."
   - Navigate to `ios/App/App/` and select both:
     - `BackgroundRemovalPlugin.swift`
     - `BackgroundRemovalPlugin.m`
   - Make sure "Copy items if needed" is checked
   - Make sure "App" target is selected
   - Click "Add"

## ✅ Step 2: Verify Plugin Registration

1. **Check `AppDelegate.swift` or `App.swift`:**
   - The plugin should auto-register via Capacitor
   - No manual registration needed if files are in the project

2. **Verify the `.m` bridge file:**
   - Open `BackgroundRemovalPlugin.m`
   - Should have: `CAP_PLUGIN(BackgroundRemovalPlugin, "BackgroundRemoval", ...)`

## ✅ Step 3: Build & Test

### Quick Test in Xcode:

1. **Build the project:**
   ```bash
   # In terminal
   cd dripify-dashboard-82
   npm run build
   npx cap sync ios
   ```

2. **Open in Xcode:**
   ```bash
   npx cap open ios
   ```

3. **Run on device/simulator:**
   - Select your iPhone or simulator
   - Press `Cmd + R` to build and run
   - Check console for any errors

### Test in Your App:

1. **Open the app on iPhone**
2. **Go to Closet → Add Piece → Take Photo**
3. **Check browser console (if using Safari remote debugging):**
   - Look for: `🎨 Removing background using iOS Vision framework...`
   - Should see: `✅ Background removed successfully (iOS)`
   - If you see: `❌ iOS background removal failed:` → Check error message

## ✅ Step 4: Debug Checklist

### If plugin doesn't work:

1. **Check Xcode console:**
   - Look for Swift errors
   - Check if plugin is registered: Search for "BackgroundRemoval"

2. **Verify Capacitor can find the plugin:**
   - In browser console, type: `Capacitor.Plugins.BackgroundRemoval`
   - Should return the plugin object (not undefined)

3. **Test plugin directly:**
   ```javascript
   // In browser console (on iOS device)
   import { Capacitor } from '@capacitor/core';
   const plugin = Capacitor.Plugins.BackgroundRemoval;
   console.log(plugin); // Should show plugin methods
   ```

4. **Check for build errors:**
   - In Xcode, check "Issue Navigator" (⌘ + 5)
   - Fix any Swift compilation errors

## ✅ Step 5: Manual Test Function

Add this to test the plugin directly:

```typescript
// In your component or browser console
async function testBackgroundRemoval() {
  // Create a test image
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, 200, 200);
  
  const dataUrl = canvas.toDataURL();
  
  try {
    const { removeImageBackground } = await import('@/utils/backgroundRemoval');
    const result = await removeImageBackground(dataUrl);
    console.log('✅ Plugin works!', result);
  } catch (error) {
    console.error('❌ Plugin failed:', error);
  }
}
```

## 🐛 Common Issues:

1. **"Plugin not found"**
   - Run: `npx cap sync ios`
   - Rebuild in Xcode

2. **Swift compilation errors**
   - Check Xcode for missing imports
   - Make sure Vision framework is linked

3. **"Method not implemented"**
   - Check `.m` file has correct method name
   - Verify Swift method matches TypeScript interface

4. **Slow performance**
   - Vision framework is fast, but first run may be slower
   - Subsequent calls should be instant

## 📱 Testing on Real Device:

**Important:** Vision framework works best on real iPhone, not simulator!

1. Connect iPhone via USB
2. Select device in Xcode
3. Build and run
4. Test background removal - should be FAST! ⚡

