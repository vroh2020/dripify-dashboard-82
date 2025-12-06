/**
 * Background Removal - Works on Web, iOS, iPad, Everything!
 * Based on bg-remove by Addy Osmani: https://github.com/addyosmani/bg-remove
 * 
 * Uses WebGPU acceleration when available (5-10x faster!)
 * Falls back to WASM for maximum compatibility (works everywhere)
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
  isInitialized: boolean;
  isLoading: boolean;
}

const state: ModelState = {
  model: null,
  processor: null,
  isWebGPUSupported: false,
  currentModelId: FALLBACK_MODEL_ID,
  isInitialized: false,
  isLoading: false
};

// Detect if running in iOS WebView (WebGPU never works here)
function isIOSWebView(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
  const isCapacitor = !!(window as any).Capacitor;
  return isIOS && isCapacitor;
}

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

// Initialize the model - SAME CODE PATH FOR WEB AND iOS
async function initializeModel(): Promise<boolean> {
  if (state.isInitialized) return true;
  if (state.isLoading) {
    console.log('⏳ Model already loading, waiting... (this happens on first image upload)');
    while (state.isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return state.isInitialized;
  }

  state.isLoading = true;

  try {
    // Check if we're in iOS WebView - WebGPU NEVER works there, skip directly to WASM
    const isIOS = isIOSWebView();
    
    if (isIOS) {
      console.log('📱 iOS WebView detected - using WASM (WebGPU not supported in iOS WebView)');
    } else {
      // Try WebGPU first on web (5-10x faster!)
      console.log('🚀 Loading background removal model... (first load: 15-40s depending on device)');
      console.log('💡 This only happens once - subsequent uploads will be instant!');
      
      const webGPUSuccess = await initializeWebGPU();
      if (webGPUSuccess) {
        state.currentModelId = WEBGPU_MODEL_ID;
        state.isInitialized = true;
        state.isLoading = false;
        console.log('✅ WebGPU acceleration active - processing will be FAST!');
        return true;
      }
      console.log('⚠️ WebGPU not available, falling back to WASM (works everywhere - iOS, iPad, web)');
    }

    // Fallback: WASM model (works everywhere - web, iOS, iPad, everything)
    console.log('🔄 Loading RMBG-1.4 model with WASM... (this may take 30-40s on first load)');
    
    // CRITICAL iOS FIXES - Configure WASM settings
    env.allowLocalModels = false;
    
    // Configure WASM for iOS WebView - proxy mode is required for file access
    if (env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.proxy = true; // FIXED: Always use proxy for iOS compatibility
      env.backends.onnx.wasm.numThreads = isIOS ? 1 : 4; // FIXED: Single thread on iOS, multi-thread on web
    }

    // Add timeout for iOS (can take 90s+ on slow devices)
    const loadWithTimeout = async (timeoutMs: number) => {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Model load timeout - please try again')), timeoutMs)
      );
      
      const load = AutoModel.from_pretrained(FALLBACK_MODEL_ID, {
        // @ts-ignore
        progress_callback: (progress: number) => {
          console.log(`📦 Loading model: ${Math.round(progress * 100)}%`);
        }
      });
      
      return Promise.race([load, timeout]);
    };

    state.model = await loadWithTimeout(isIOS ? 120000 : 60000); // 2min iOS, 1min web

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
    console.log('✅ Model loaded (RMBG-1.4 WASM) - works on web, iOS, iPad, everything!');
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
 * Remove background from a Blob - OPTIMIZED FOR WEB AND iOS
 * Lazy loads model on first call (can take 30-40s on iOS, 15-20s on web)
 */
export async function removeBackgroundFromBlob(blob: Blob): Promise<Blob> {
  try {
    console.log('🎨 Starting background removal from blob...');
    const startTime = Date.now();

    // iOS Debug Info
    const isIOS = isIOSWebView();
    if (isIOS) {
      console.log('🍎 iOS Debug:', {
        isIOSWebView: true,
        modelInitialized: state.isInitialized,
        modelLoading: state.isLoading,
        backend: state.currentModelId,
        wasmProxy: env.backends?.onnx?.wasm?.proxy,
        wasmThreads: env.backends?.onnx?.wasm?.numThreads
      });
    }

    // Initialize model - this will lazy load on first call
    // On first load: 30-40s on iOS (WASM), 15-20s on web (WebGPU)
    // Subsequent calls: 3-5s on iOS, 1-2s on web
    const modelInitialized = await initializeModel();
    
    if (!modelInitialized || !state.model || !state.processor) {
      throw new Error("Model not initialized");
    }

    // Create object URL for image loading - works on both web and iOS
    const objectUrl = URL.createObjectURL(blob);
    let img: RawImage;
    try {
      img = await RawImage.fromURL(objectUrl);
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      console.error('❌ Failed to load image from blob:', error);
      throw new Error('Failed to load image for processing');
    }
    URL.revokeObjectURL(objectUrl);

    console.log(`📐 Original image size: ${img.width}x${img.height}`);

    // Optimize image size for performance - iOS WASM is slower, so use smaller images
    // WebGPU can handle larger images, but iOS WebView always uses WASM
    const MAX_SIZE_WEBGPU = 1536; // WebGPU can handle bigger images
    const MAX_SIZE_WASM = 512;     // Optimized for iOS WASM speed (prevents memory issues)
    
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
    // On iOS, provide more detailed error info
    if (isIOSWebView()) {
      console.error('📱 iOS WebView error details:', {
        error: error instanceof Error ? error.message : String(error),
        modelInitialized: state.isInitialized,
        modelId: state.currentModelId
      });
    }
    // Return original blob if processing fails (graceful degradation)
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
    isInitialized: state.isInitialized
  };
}