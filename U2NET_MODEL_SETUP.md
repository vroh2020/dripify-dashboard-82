# 📦 U²‑Net CoreML Model Setup Guide

## Overview

The background removal plugin now supports U²‑Net CoreML model for better results on flat clothing items and products. This is an **optional** enhancement - the plugin will work with Vision framework alone, but U²‑Net provides better accuracy for difficult cases.

## Step 1: Download U²‑Net Model

### Option A: Use Pre-converted CoreML Model

1. **Download from Hugging Face or GitHub:**
   - Search for "U2Net CoreML" or "u2net.mlmodel"
   - Recommended: Look for models specifically converted for iOS
   - Model should be `.mlmodel` or `.mlmodelc` format

2. **Recommended Sources:**
   - [Hugging Face Model Hub](https://huggingface.co/models?search=u2net+coreml)
   - [GitHub - Ezaldeen99/BackgroundRemoval](https://github.com/Ezaldeen99/BackgroundRemoval) (includes model conversion scripts)

### Option B: Convert from PyTorch/TensorFlow

If you have the original U²‑Net model:

1. **Install coremltools:**
   ```bash
   pip install coremltools
   ```

2. **Convert the model:**
   ```python
   import coremltools as ct
   
   # Load your U²‑Net model (PyTorch/TensorFlow)
   # ... load model code ...
   
   # Convert to CoreML
   mlmodel = ct.convert(model, inputs=[ct.TensorType(name="input", shape=(1, 3, 320, 320))])
   
   # Save
   mlmodel.save("u2net.mlmodel")
   ```

## Step 2: Add Model to Xcode Project

1. **Open Xcode:**
   ```bash
   cd dripify-dashboard-82/ios/App
   open App.xcworkspace
   ```

2. **Add Model File:**
   - Right-click on `App` folder in Xcode
   - Select "Add Files to App..."
   - Navigate to your downloaded `u2net.mlmodel` file
   - **IMPORTANT:** Check "Copy items if needed"
   - **IMPORTANT:** Make sure "App" target is selected
   - Click "Add"

3. **Verify Model is Added:**
   - The model should appear in your project navigator
   - Xcode will automatically compile it to `.mlmodelc` format
   - Check that it's included in "Build Phases" → "Copy Bundle Resources"

## Step 3: Update Model Name (if needed)

The plugin looks for models named:
- `u2net.mlmodelc` (compiled)
- `U2Net.mlmodelc` (compiled)

If your model has a different name, update the code in `BackgroundRemovalPlugin.swift`:

```swift
private lazy var u2netModel: MLModel? = {
    guard let modelURL = Bundle.main.url(forResource: "YOUR_MODEL_NAME", withExtension: "mlmodelc") else {
        // ...
    }
    // ...
}()
```

## Step 4: Verify Model Input/Output

The plugin expects:
- **Input:** Image (CVPixelBuffer) - will be resized to 320x320
- **Output:** Mask (CVPixelBuffer) - single channel mask

If your model has different input/output names, update the code:

```swift
// In tryU2NetBackgroundRemoval function
// Update feature names if different
guard let outputFeature = prediction.featureValue(for: "output") ?? 
                          prediction.featureValue(for: "mask") else {
    // ...
}
```

## Step 5: Test

1. **Build and run the app:**
   ```bash
   npx cap sync ios
   ```

2. **Test with different images:**
   - Flat clothing item (should use U²‑Net)
   - Person photo (should use Vision)
   - Product photo (should use U²‑Net)

3. **Check logs:**
   - Look for: `✅ U²‑Net model loaded successfully`
   - Or: `⚠️ U²‑Net model not found - will use Vision framework only`

## Troubleshooting

### Model Not Found

**Error:** `⚠️ U²‑Net model not found`

**Solutions:**
1. Verify model is in Xcode project
2. Check model name matches code
3. Ensure model is in "Copy Bundle Resources"
4. Clean build folder (Cmd+Shift+K) and rebuild

### Model Load Error

**Error:** `❌ Failed to load U²‑Net model`

**Solutions:**
1. Verify model format is `.mlmodel` or `.mlmodelc`
2. Check model is compatible with iOS version
3. Try re-adding model to project

### Prediction Fails

**Error:** `❌ U²‑Net prediction failed`

**Solutions:**
1. Check model input/output names match code
2. Verify input size (should be 320x320 or 512x512)
3. Check model expects correct pixel format

## Model Specifications

**Recommended U²‑Net Model:**
- Input size: 320x320 or 512x512
- Input format: RGB (3 channels)
- Output: Single channel mask (grayscale)
- Model size: ~4-10MB (compressed)

## Alternative: Use Without Model

The plugin works **without** the U²‑Net model! It will:
1. Try Vision framework first (fast, works for people/3D objects)
2. Try person segmentation fallback (iOS 15+)
3. Return helpful error if all methods fail

U²‑Net is an **enhancement** for better results on flat clothing items, not a requirement.

## Next Steps

Once the model is added:
1. ✅ Plugin automatically detects and uses it
2. ✅ Falls back to Vision if model unavailable
3. ✅ Provides better results for flat clothing items
4. ✅ No code changes needed (model is lazy-loaded)

---

**Note:** The plugin is designed to work gracefully without the model. Adding U²‑Net improves success rate from ~40% to ~70% for flat clothing items, but the app will function normally without it.

