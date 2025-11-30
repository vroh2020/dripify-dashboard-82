# 🔍 Background Removal Debugging Guide

## How to Check Logs

### Method 1: Xcode Console (Recommended for Native Logs)

1. **Open Xcode**
   - Open `ios/App/App.xcworkspace` (NOT `.xcodeproj`)
   - Make sure your device is connected

2. **Run the App**
   - Select your device from the device dropdown
   - Press `Cmd + R` to build and run

3. **View Console Logs**
   - In Xcode, go to **View → Debug Area → Show Debug Area** (or press `Cmd + Shift + Y`)
   - The bottom panel will show console output
   - Look for logs starting with:
     - `🎨 Starting background removal process...`
     - `📐 Image size: ...`
     - `✅ Detected X foreground instance(s)`
     - `❌` for errors

4. **Filter Logs**
   - In the console search bar, type: `BackgroundRemoval` or `🎨`
   - This filters to only background removal logs

### Method 2: Safari Web Inspector (For JavaScript Logs)

1. **Enable Web Inspector on iOS**
   - Settings → Safari → Advanced → Web Inspector (ON)

2. **Connect Device**
   - Connect iPhone to Mac via USB
   - Open Safari on Mac

3. **Open Web Inspector**
   - Safari → Develop → [Your Device Name] → [Your App Name]
   - Console tab shows JavaScript logs

4. **Look for Logs**
   - `🔍 Platform detected: ios`
   - `🎨 Attempting background removal...`
   - `✅ Background removed successfully` or `⚠️` warnings

### Method 3: In-App Debugger

The app has a built-in debugger component. To access it:

1. Navigate to the Background Removal Debugger page (if available in your app)
2. Click "Check Plugin Registration" to verify the plugin is loaded
3. Test with sample images
4. View logs in the debugger UI

## Common Issues & Solutions

### Issue 1: iOS Version Too Old

**Symptom:** Logs show "⚠️ Background removal requires iOS 17+"

**Solution:**
- The plugin requires iOS 17.0 or later
- Check iOS version: Settings → General → About → Software Version
- Update device if possible

**Check in Code:**
```swift
// BackgroundRemovalPlugin.swift line 17
guard #available(iOS 17.0, *) else {
    // Returns error
}
```

### Issue 2: No Objects Detected

**Symptom:** Logs show "⚠️ No objects detected in image"

**Why This Happens:**
- Vision framework works best with 3D objects (people, furniture, etc.)
- Flat clothing items on similar backgrounds are hard to detect
- Low contrast between item and background

**Solutions:**
- Use photos with clear contrast (dark item on light background, or vice versa)
- Take photos of items hanging or on a mannequin (3D shape)
- Avoid flat lays on similar-colored surfaces
- Try photos with the item being worn

**Check in Code:**
```swift
// BackgroundRemovalPlugin.swift line 126
guard let result = request.results?.first else {
    // No objects detected
}
```

### Issue 3: Plugin Not Registered

**Symptom:** JavaScript logs show "⚠️ BackgroundRemoval plugin not available"

**Solutions:**
1. **Rebuild in Xcode:**
   ```bash
   cd ios/App
   pod install
   ```
   Then rebuild in Xcode (Cmd + B)

2. **Sync Capacitor:**
   ```bash
   npx cap sync ios
   ```

3. **Verify Plugin Files:**
   - Check `ios/App/App/BackgroundRemovalPlugin.swift` exists
   - Check `ios/App/App/BackgroundRemovalPlugin.m` exists
   - Check both are added to Xcode project

### Issue 4: Mask Generation Fails

**Symptom:** Logs show "❌ Failed to generate mask"

**Possible Causes:**
- Image too large (plugin auto-resizes, but may still fail)
- Vision API internal error
- Memory issues

**Solutions:**
- Try a smaller image
- Restart the app
- Check device memory

### Issue 5: Response Format Mismatch

**Symptom:** Plugin works but frontend doesn't receive processed image

**Check:**
- Swift returns: `{ "imageData": "...", "success": true }`
- Frontend expects: `result.imageData` or `result.image`
- Both should work, but verify in logs

## Debugging Steps

### Step 1: Verify Plugin is Loaded

**In JavaScript Console (Safari Web Inspector):**
```javascript
const { Capacitor } = await import('@capacitor/core');
console.log('Platform:', Capacitor.getPlatform());
console.log('Plugins:', Object.keys((Capacitor).Plugins));
console.log('BackgroundRemoval:', (Capacitor).Plugins.BackgroundRemoval);
```

**Expected Output:**
```
Platform: ios
Plugins: ["BackgroundRemoval", "Camera", ...]
BackgroundRemoval: { removeBackground: function }
```

### Step 2: Test Plugin Directly

**In JavaScript Console:**
```javascript
const plugin = (Capacitor).Plugins.BackgroundRemoval;

// Create test image
const canvas = document.createElement('canvas');
canvas.width = 200;
canvas.height = 200;
const ctx = canvas.getContext('2d');
ctx.fillStyle = 'red';
ctx.fillRect(50, 50, 100, 100);
const testImage = canvas.toDataURL();

// Call plugin
const result = await plugin.removeBackground({ image: testImage });
console.log('Result:', result);
```

**Expected Output:**
```javascript
{
  imageData: "data:image/png;base64,...",
  success: true
}
```

### Step 3: Check iOS Version

**In Xcode Console, look for:**
```
⚠️ Background removal requires iOS 17+, current version: 16.5
```

Or check in JavaScript:
```javascript
// This won't show iOS version directly, but check user agent
console.log(navigator.userAgent);
```

### Step 4: Monitor Full Flow

**Enable verbose logging:**
1. Open `src/utils/backgroundRemoval.ts`
2. All console.log statements are already there
3. Check Safari Web Inspector console for full flow

**Expected Log Sequence:**
```
🔍 Platform detected: ios
🎨 Attempting background removal using iOS Vision framework...
📦 Image data size: 123456 characters
✅ Background removed successfully (iOS 17+)
📦 Processed image size: 98765 characters
```

## Quick Test Commands

### Test from JavaScript Console

```javascript
// Import the utility
const { removeImageBackground } = await import('/src/utils/backgroundRemoval.ts');

// Create test image
const canvas = document.createElement('canvas');
canvas.width = 400;
canvas.height = 400;
const ctx = canvas.getContext('2d');
ctx.fillStyle = 'white';
ctx.fillRect(0, 0, 400, 400);
ctx.fillStyle = 'blue';
ctx.fillRect(100, 100, 200, 200);
const testImage = canvas.toDataURL('image/png');

// Test
const result = await removeImageBackground(testImage);
console.log('Original size:', testImage.length);
console.log('Result size:', result.length);
console.log('Changed?', result !== testImage);
```

## What to Look For in Logs

### ✅ Success Indicators:
- `✅ Detected X foreground instance(s)`
- `✅ Mask generated successfully`
- `✅ Background removal successful!`
- `✅ Background removed successfully (iOS 17+)`

### ⚠️ Warning Indicators:
- `⚠️ Background removal requires iOS 17+`
- `⚠️ No objects detected in image`
- `⚠️ Background removal returned original image`

### ❌ Error Indicators:
- `❌ Background removal: Image data is missing`
- `❌ Failed to generate mask`
- `❌ Vision analysis failed`
- `❌ Failed to apply mask to image`

## Next Steps

1. **Check Xcode Console** for native Swift logs
2. **Check Safari Web Inspector** for JavaScript logs
3. **Verify iOS version** is 17.0+
4. **Test with high-contrast images** (dark item on light background)
5. **Check plugin registration** using the debugger component

If issues persist, share the relevant log output for further debugging.

