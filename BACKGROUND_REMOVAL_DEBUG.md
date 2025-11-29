# Background Removal Not Working on iOS 17+ - Troubleshooting Guide

## Quick Diagnostics

1. **Open the debug page in your app:**
   - Navigate to `/debug/background-removal` in your app
   - Or open Safari and go to: `http://localhost:5173/debug/background-removal` (dev mode)

2. **Run the diagnostic tests:**
   - Click "1. Check Plugin Registration" - this will show if the plugin is loaded
   - Click "2. Test with Simple Shape" - tests with a basic image
   - Click "3. Test with Your Photo" - upload a real clothing photo

3. **Check the logs** - they will show exactly what's failing

## Common Issues & Solutions

### Issue 1: Plugin Not Found ❌

**Symptoms:**
- Logs show: "BackgroundRemoval plugin NOT found!"

**Solution:**
```bash
# You need to rebuild the iOS app in Xcode
cd dripify-dashboard-82/ios/App
open App.xcworkspace

# In Xcode:
# 1. Product > Clean Build Folder (Cmd+Shift+K)
# 2. Product > Build (Cmd+B)
# 3. Run on your device
```

### Issue 2: No Objects Detected ⚠️

**Symptoms:**
- Logs show: "No objects detected - Vision couldn't identify foreground items"
- Image returns unchanged

**Why:** The Vision API (`VNGenerateForegroundInstanceMaskRequest`) is designed for **3D objects**, not flat clothing items laid on surfaces. It works best with:
- Photos of people wearing clothes ✅
- 3D objects with depth ✅
- Flat clothes on a surface ❌ (this is your issue!)

**Solutions:**

**Option A: Take better photos**
- Hold the clothing item up against a contrasting background
- Take photos at an angle (not flat/top-down)
- Ensure good lighting with clear shadows
- Make sure there's clear contrast between item and background

**Option B: Use a fallback (recommended)**
We can integrate a web-based background removal API:
- Remove.bg API (free tier: 50 images/month)
- Background Removal API from Cloudinary
- Hugging Face's RMBG API

### Issue 3: iOS Version Too Old

**Symptoms:**
- Logs show: "iOS 17+ required, current: 16.x"

**Solution:**
- Update your iPhone to iOS 17 or later
- Or disable background removal for older iOS versions

## Check Xcode Console for Native Logs

The Swift plugin logs detailed information:

```
🎨 Starting background removal process...
📐 Image size: 1024x768
🔍 Performing Vision analysis for foreground object detection...
```

To view these logs:
1. Open Xcode
2. Window > Devices and Simulators
3. Select your device
4. Click "Open Console"
5. Filter for "Background" or "Vision"

## Next Steps

Based on what you see in the debug tool:

1. **Plugin not found** → Rebuild in Xcode
2. **No objects detected** → Vision API limitation with flat clothing
3. **Other error** → Share the error message from the logs

## Alternative Solution: Web-Based Background Removal

If Vision API doesn't work well for flat clothing, we can add a fallback:

```typescript
// In backgroundRemoval.ts
async function removeBackgroundWithAPI(imageDataUrl: string): Promise<string> {
  // Use Remove.bg or similar API
  // This works great for flat clothing!
}
```

---

## Current Test Status

Run the debug tool at `/debug/background-removal` and share the console output. The detailed logs will show exactly where it's failing.

Most likely issue: **Vision API not detecting flat clothing items** (technical limitation of `VNGenerateForegroundInstanceMaskRequest`)


