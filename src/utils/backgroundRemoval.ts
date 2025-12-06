/**
 * Background Removal - Optimized for Web Performance
 * Based on bg-remove by Addy Osmani: https://github.com/addyosmani/bg-remove
 * 
 * On Web: Uses WebGPU acceleration for 5-10x faster processing
 * On iOS Native: Uses WASM with optimized settings
 */

import {
  env,
  AutoModel,
  AutoProcessor,
  RawImage,
  // @ts-ignore
  PreTrainedModel,
  // @ts-ignore
  Processor
} from "@huggingface/transformers";

// Model IDs
const WEBGPU_MODEL_ID = "Xenova/modnet";
const FALLBACK_MODEL_ID = "briaai/RMBG-1.4";

interface ModelState {
  model: PreTrainedModel | null;
  processor: Processor | null;
  isWebGPUSupported: boolean;
  currentModelId: string;
  isIOS: boolean;
  isWeb: boolean;
  isInitialized: boolean;
  isLoading: boolean;
}

// Check if we're on web (not native)
const isWebPlatform = (): boolean => {
  if (typeof window === 'undefined') return false;
  const platform = (window as any).Capacitor?.getPlatform?.();
  return !platform || platform === 'web';
};

// Check if we're in a native iOS Capacitor app (ONLY for native apps, not web)
const isNativeIOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const platform = (window as any).Capacitor?.getPlatform?.();
  return platform === 'ios';
};

const state: ModelState = {
  model: null,
  processor: null,
  isWebGPUSupported: false,
  currentModelId: FALLBACK_MODEL_ID,
  isIOS: typeof window !== 'undefined' ? isNativeIOSDevice() : false, // ONLY check for native iOS
  isWeb: typeof window !== 'undefined' ? isWebPlatform() : true,
  isInitialized: false,
  isLoading: false
};

// Initialize WebGPU with proper error handling
async function initializeWebGPU(): Promise<boolean> {
  const gpu = (navigator as any).gpu;
  if (!gpu) {
    console.log('⚠️ WebGPU not available in browser');
    return false;
  }

  try {
    console.log('🚀 Attempting WebGPU acceleration...');
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      console.warn('⚠️ WebGPU adapter not available');
      return false;
    }
    
    env.allowLocalModels = false;
    if (env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.proxy = false;
    }

    // Wait longer for WASM to initialize before WebGPU
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('⚡ Loading MODNet model with WebGPU...');
    state.model = await AutoModel.from_pretrained(WEBGPU_MODEL_ID, {
      device: "webgpu",
      // @ts-ignore
      config: { model_type: 'modnet', architectures: ['MODNet'] }
    });
    state.processor = await AutoProcessor.from_pretrained(WEBGPU_MODEL_ID);
    state.isWebGPUSupported = true;
    console.log('✅ WebGPU model loaded successfully!');
    return true;
  } catch (error) {
    console.warn("⚠️ WebGPU initialization failed, will use WASM:", error);
    return false;
  }
}

// Initialize the model - Web optimized
async function initializeModel(): Promise<boolean> {
  if (state.isInitialized) return true;
  if (state.isLoading) {
    while (state.isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return state.isInitialized;
  }

  state.isLoading = true;

  try {
    // On web: ALWAYS try WebGPU first (5-10x faster!)
    // Ignore iOS detection completely on web - web browsers are NOT iOS!
    if (state.isWeb) {
      console.log('🌐 Web platform detected - prioritizing WebGPU for speed');
      
      const webGPUSuccess = await initializeWebGPU();
      if (webGPUSuccess) {
        state.currentModelId = WEBGPU_MODEL_ID;
        state.isInitialized = true;
        state.isLoading = false;
        console.log('✅ WebGPU acceleration active - processing will be FAST!');
        return true;
      }
      console.log('⚠️ WebGPU not available, falling back to WASM');
    }

    // For native iOS Capacitor apps only
    if (state.isIOS) {
      console.log('🍎 iOS native Capacitor app detected, using RMBG-1.4 model');
      env.allowLocalModels = false;
      if (env.backends?.onnx?.wasm) {
        env.backends.onnx.wasm.proxy = true;
      }

      state.model = await AutoModel.from_pretrained(FALLBACK_MODEL_ID, {
        // @ts-ignore
        config: { model_type: 'custom' }
      });

      state.processor = await AutoProcessor.from_pretrained(FALLBACK_MODEL_ID, {
        // @ts-ignore
        config: {
          do_normalize: true,
          do_pad: false,
          do_rescale: true,
          do_resize: true,
          image_mean: [0.5, 0.5, 0.5],
          feature_extractor_type: "ImageFeatureExtractor",
          image_std: [1, 1, 1],
          resample: 2,
          rescale_factor: 0.00392156862745098,
          size: { width: 1024, height: 1024 },
        }
      });

      state.currentModelId = FALLBACK_MODEL_ID;
      state.isInitialized = true;
      state.isLoading = false;
      console.log('✅ Model loaded (iOS RMBG-1.4)');
      return true;
    }

    // Fallback: WASM model (works everywhere but slower)
    console.log('🔄 Loading RMBG-1.4 model with WASM...');
    env.allowLocalModels = false;
    if (env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.proxy = true;
    }

    state.model = await AutoModel.from_pretrained(FALLBACK_MODEL_ID, {
      // @ts-ignore
      progress_callback: (progress: number) => {
        console.log(`📦 Loading model: ${Math.round(progress * 100)}%`);
      }
    });

    state.processor = await AutoProcessor.from_pretrained(FALLBACK_MODEL_ID, {
      // @ts-ignore
      config: {
        do_normalize: true,
        do_pad: true,
        do_rescale: true,
        do_resize: true,
        image_mean: [0.5, 0.5, 0.5],
        feature_extractor_type: "ImageFeatureExtractor",
        image_std: [0.5, 0.5, 0.5],
        resample: 2,
        rescale_factor: 0.00392156862745098,
        size: { width: 1024, height: 1024 }
      }
    });

    state.currentModelId = FALLBACK_MODEL_ID;
    state.isInitialized = true;
    state.isLoading = false;
    console.log('✅ Model loaded (RMBG-1.4 WASM)');
    return true;
    } catch (error) {
    console.error("❌ Error initializing model:", error);
    state.isLoading = false;
        throw error;
      }
}

/**
 * Pre-load the model (optional - call early in app lifecycle)
 * On web, this enables instant processing!
 */
export async function preloadBackgroundRemovalModel(): Promise<void> {
  try {
    console.log('🚀 Pre-loading background removal model...');
    await initializeModel();
    console.log('✅ Model pre-loaded and ready!');
  } catch (error) {
    console.warn('⚠️ Failed to pre-load model:', error);
  }
}

/**
 * Remove background from a base64 data URL image
 */
export async function removeImageBackground(imageDataUrl: string): Promise<string> {
  try {
    console.log('🎨 Starting background removal...');
    const startTime = Date.now();

    if (!imageDataUrl || imageDataUrl.length === 0) {
      console.warn('⚠️ Empty image data provided');
      return imageDataUrl;
    }

    await initializeModel();

    if (!state.model || !state.processor) {
      throw new Error("Model not initialized");
    }

    const img = await RawImage.fromURL(imageDataUrl);
    console.log(`📐 Image size: ${img.width}x${img.height}`);

    const { pixel_values } = await state.processor(img);
    const { output } = await state.model({ input: pixel_values });

    const maskData = (
      await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(
        img.width,
        img.height
      )
    ).data;

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2d context");

    ctx.drawImage(img.toCanvas(), 0, 0);

    const pixelData = ctx.getImageData(0, 0, img.width, img.height);
    for (let i = 0; i < maskData.length; ++i) {
      pixelData.data[4 * i + 3] = maskData[i] ?? 0;
    }
    ctx.putImageData(pixelData, 0, 0);

    const resultDataUrl = canvas.toDataURL("image/png", 1.0);

    const duration = Date.now() - startTime;
    console.log(`✅ Background removed in ${duration}ms (${state.isWebGPUSupported ? 'WebGPU' : 'WASM'})`);

    return resultDataUrl;
  } catch (error) {
    console.error('❌ Background removal failed:', error);
  return imageDataUrl;
  }
}

/**
 * Remove background from a Blob - OPTIMIZED FOR WEB
 */
export async function removeBackgroundFromBlob(blob: Blob): Promise<Blob> {
  try {
    console.log('🎨 Starting background removal from blob...');
    const startTime = Date.now();

    await initializeModel();

    if (!state.model || !state.processor) {
      throw new Error("Model not initialized");
    }

    const objectUrl = URL.createObjectURL(blob);
    let img = await RawImage.fromURL(objectUrl);
    URL.revokeObjectURL(objectUrl);

    console.log(`📐 Original image size: ${img.width}x${img.height}`);

    // Aggressive optimization for speed - smaller images = faster processing
    // WebGPU would allow larger, but since it's failing, optimize for WASM speed
    const MAX_SIZE_WEBGPU = 1536; // WebGPU can handle bigger images
    const MAX_SIZE_WASM = 512;    // Aggressive size for WASM speed (was 768)
    
    const MAX_SIZE = state.isWebGPUSupported ? MAX_SIZE_WEBGPU : MAX_SIZE_WASM;
    
    if (Math.max(img.width, img.height) > MAX_SIZE) {
      const scaleFactor = MAX_SIZE / Math.max(img.width, img.height);
      const newWidth = Math.round(img.width * scaleFactor);
      const newHeight = Math.round(img.height * scaleFactor);
      img = await img.resize(newWidth, newHeight);
      console.log(`📐 Resized to: ${img.width}x${img.height} for maximum speed`);
    }

    const { pixel_values } = await state.processor(img);
    const { output } = await state.model({ input: pixel_values });

    const maskData = (
      await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(
        img.width,
        img.height
      )
    ).data;

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2d context");

    ctx.drawImage(img.toCanvas(), 0, 0);

    const pixelData = ctx.getImageData(0, 0, img.width, img.height);
    for (let i = 0; i < maskData.length; ++i) {
      pixelData.data[4 * i + 3] = maskData[i] ?? 0;
    }
    ctx.putImageData(pixelData, 0, 0);

    const resultBlob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => b ? resolve(b) : reject(new Error("Failed to create blob")),
        "image/png"
      )
    );

    const duration = Date.now() - startTime;
    const speedType = state.isWebGPUSupported ? '⚡ WebGPU' : '🐌 WASM';
    console.log(`✅ Background removed in ${duration}ms (${speedType})`);

    return resultBlob;
  } catch (error) {
    console.error('❌ Background removal failed:', error);
    return blob;
  }
}

/**
 * Check if background removal is available
 */
export function isBackgroundRemovalAvailable(): boolean {
  return typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof fetch !== 'undefined';
}

/**
 * Check if the model is currently loading
 */
export function isModelLoading(): boolean {
  return state.isLoading;
}

/**
 * Get model info (for debugging)
 */
export function getModelInfo() {
  return {
    currentModelId: state.currentModelId,
    isWebGPUSupported: state.isWebGPUSupported,
    isIOS: state.isIOS,
    isWeb: state.isWeb,
    isInitialized: state.isInitialized
  };
}
