# 🚀 Quick Guide: How to Check Background Removal Logs

## Method 1: Xcode Console (Best for Native Errors)

### Steps:
1. **Open Xcode** → Open `ios/App/App.xcworkspace`
2. **Connect your iPhone** via USB
3. **Run the app** → Press `Cmd + R`
4. **Show Console** → Press `Cmd + Shift + Y` (or View → Debug Area → Show Debug Area)
5. **Filter logs** → Type `🎨` or `BackgroundRemoval` in the search bar

### What to Look For:

**✅ Success:**
```
🎨 Starting background removal process...
📐 Image size: 1024x768
✅ Detected 1 foreground instance(s)
✅ Mask generated successfully
✅ Background removal successful!
```

**❌ Errors:**
```
⚠️ Background removal requires iOS 17+, current version: 16.5
⚠️ No objects detected in image
❌ Vision analysis failed with error: ...
❌ Failed to generate mask
```

---

## Method 2: Safari Web Inspector (Best for JavaScript)

### Steps:
1. **On iPhone:** Settings → Safari → Advanced → Web Inspector (ON)
2. **Connect iPhone to Mac** via USB
3. **Open Safari on Mac**
4. **Develop menu** → [Your Device] → [Your App Name]
5. **Click Console tab**

### What to Look For:

**✅ Success:**
```
🔍 Platform detected: ios
🎨 Attempting background removal using iOS Vision framework...
📦 Image data size: 123456 characters
📥 Plugin response received: { hasImageData: true, success: true }
✅ Background removed successfully (iOS 17+)
```

**❌ Errors:**
```
⚠️ BackgroundRemoval plugin not available
⚠️ Background removal returned original image
❌ Background removal failed: No objects detected
```

---

## Method 3: In-App Debugger

If your app has the BackgroundRemovalDebugger component:
1. Navigate to the debugger page
2. Click "Check Plugin Registration"
3. Test with sample images
4. View logs in the UI

---

## Common Issues Quick Fix

| Issue | Check | Solution |
|-------|-------|----------|
| **Plugin not found** | JavaScript console | Run `npx cap sync ios` and rebuild |
| **iOS version too old** | Xcode console | Update to iOS 17.0+ |
| **No objects detected** | Xcode console | Use high-contrast photos (dark item on light bg) |
| **Silent failure** | Check blob sizes match | Background removal failed, using original |

---

## Quick Test Command

**In Safari Web Inspector Console:**
```javascript
// Test plugin directly
const plugin = (Capacitor).Plugins.BackgroundRemoval;
const canvas = document.createElement('canvas');
canvas.width = 200; canvas.height = 200;
const ctx = canvas.getContext('2d');
ctx.fillStyle = 'red';
ctx.fillRect(50, 50, 100, 100);
const test = await plugin.removeBackground({ image: canvas.toDataURL() });
console.log('Result:', test);
```

---

## What Each Log Means

| Log Message | Meaning | Action |
|------------|---------|--------|
| `🎨 Starting background removal process...` | Plugin called successfully | ✅ Good |
| `📐 Image size: 1024x768` | Image loaded correctly | ✅ Good |
| `✅ Detected X foreground instance(s)` | Vision found objects | ✅ Good |
| `⚠️ No objects detected` | Vision couldn't find objects | Try different photo |
| `❌ Vision analysis failed` | Vision API error | Check Xcode for details |
| `⚠️ iOS 17+ required` | Device too old | Update iOS |

---

**Need more help?** See `DEBUG_BACKGROUND_REMOVAL.md` for detailed troubleshooting.

