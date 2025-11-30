import { Capacitor, registerPlugin } from '@capacitor/core';

interface BackgroundRemovalPlugin {
  removeBackground(options: { image: string }): Promise<{ 
    imageData?: string; 
    image?: string; 
    success?: boolean; 
    error?: string 
  }>;
}

/**
 * Check if the BackgroundRemoval plugin is available
 */
function isPluginAvailable(): boolean {
  try {
    const platform = Capacitor.getPlatform();
    if (platform !== 'ios') {
      return false;
    }
    
    // For Capacitor 7+, plugins are always "available" as proxies
    // The real test is when we call the native method
    // Just check if we're on native iOS platform
    return Capacitor.isNativePlatform();
  } catch (error) {
    console.warn('⚠️ Error checking plugin availability:', error);
    return false;
  }
}

// Register the plugin using Capacitor 7's registerPlugin
const BackgroundRemoval = registerPlugin<BackgroundRemovalPlugin>('BackgroundRemoval');

/**
 * Remove background from an image
 * - On iOS 17+: Uses Vision framework for generic object removal (clothing, etc)
 * - On iOS 15-16: Not supported for objects, returns original
 * - On Web/Android: Returns original image
 * 
 * @param imageDataUrl - Base64 encoded image data URL
 * @returns Promise resolving to processed image data URL or original if processing fails
 */
export async function removeImageBackground(imageDataUrl: string): Promise<string> {
  const platform = Capacitor.getPlatform();
  
  console.log('🔍 Platform detected:', platform);
  
  if (platform === 'ios') {
    // Check plugin availability first
    if (!isPluginAvailable()) {
      console.warn('⚠️ BackgroundRemoval plugin not available - plugin may not be registered');
      console.log('ℹ️ Using original image without background removal');
      return imageDataUrl;
    }
    
    if (!BackgroundRemoval) {
      console.warn('⚠️ BackgroundRemoval plugin instance is null');
      console.log('ℹ️ Using original image without background removal');
      return imageDataUrl;
    }
    
    try {
      console.log('🎨 Attempting background removal using iOS Vision framework...');
      console.log('📦 Image data size:', imageDataUrl.length, 'characters');
      
      // Validate input
      if (!imageDataUrl || imageDataUrl.length === 0) {
        console.warn('⚠️ Empty image data provided');
        throw new Error('Empty image data provided');
      }
      
      console.log('📞 Calling native BackgroundRemoval plugin...');
      const result = await BackgroundRemoval.removeBackground({ image: imageDataUrl });
      console.log('📥 Native plugin responded!');
      
      // Log EVERYTHING for debugging
      console.log('📥 Plugin response details:', {
        hasImageData: !!result?.imageData,
        hasImage: !!result?.image,
        success: result?.success,
        error: result?.error,
        imageDataLength: result?.imageData?.length || 0,
        imageLength: result?.image?.length || 0,
        originalLength: imageDataUrl.length,
        resultType: typeof result,
        resultKeys: result ? Object.keys(result) : 'null'
      });
      
      // Handle both imageData (from Swift) and image (fallback)
      const processedImage = result?.imageData || result?.image;
      
      // Check success flag FIRST (most reliable)
      if (result?.success === false) {
        const errorMsg = result?.error || 'Background removal failed - Vision could not detect objects in your photo';
        console.error('❌ Plugin returned success: false');
        console.error('Error:', errorMsg);
        throw new Error(errorMsg);
      }
      
      // Check if we got an error message
      if (result?.error) {
        console.error('❌ Background removal error from plugin:', result.error);
        throw new Error(result.error);
      }
      
      if (!processedImage) {
        console.error('❌ No image data in plugin response');
        throw new Error('Plugin returned no image data - background removal failed');
      }
      
      // Check if the result looks like it was actually processed (PNG with transparency)
      const isPNG = processedImage.includes('image/png');
      const sizeChange = Math.abs(processedImage.length - imageDataUrl.length) / imageDataUrl.length;
      
      console.log('📊 Processing analysis:', {
        isPNG,
        sizeChangePercent: (sizeChange * 100).toFixed(1) + '%',
        processedLength: processedImage.length,
        originalLength: imageDataUrl.length
      });
      
      // If output is exactly the same as input, it failed
      if (processedImage === imageDataUrl) {
        console.error('❌ Output identical to input - no processing occurred');
        throw new Error('Background removal failed - Vision could not detect the clothing item. Try: 1) Better lighting, 2) Higher contrast (dark item on light background), 3) Photo of item hanging (3D shape works better)');
      }
      
      // Success!
      console.log('✅ Background removed successfully!');
      console.log('📊 Size change:', (sizeChange * 100).toFixed(1) + '%');
      return processedImage;
    } catch (error) {
      console.error('❌ iOS background removal threw exception:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        // Re-throw so caller can handle it properly
        throw error;
      }
      throw new Error('Unknown error during background removal');
    }
  }
  
  // For web/Android, return original for now
  console.log('ℹ️ Background removal not available on this platform, using original image');
  return imageDataUrl;
}

/**
 * Remove background from a Blob
 * 
 * @param blob - Image blob to process
 * @returns Promise resolving to processed image blob or original if processing fails
 */
export async function removeBackgroundFromBlob(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      try {
        const dataUrl = reader.result as string;
        if (!dataUrl) {
          reject(new Error('Failed to read blob as data URL'));
          return;
        }
        
        const processedDataUrl = await removeImageBackground(dataUrl);
        
        // Convert back to Blob
        try {
          const response = await fetch(processedDataUrl);
          const processedBlob = await response.blob();
          resolve(processedBlob);
        } catch (fetchError) {
          console.error('❌ Failed to convert processed image to blob:', fetchError);
          // Re-throw error so caller can handle it
          reject(new Error(`Failed to convert processed image to blob: ${fetchError}`));
        }
      } catch (error) {
        console.error('❌ Error processing image:', error);
        // Re-throw error so caller can handle it properly
        reject(error);
      }
    };
    
    reader.onerror = () => {
      console.error('❌ FileReader error');
      reject(new Error('Failed to read blob'));
    };
    
    reader.readAsDataURL(blob);
  });
}

/**
 * Check if background removal is available on the current platform
 * 
 * @returns true if background removal is available, false otherwise
 */
export function isBackgroundRemovalAvailable(): boolean {
  const platform = Capacitor.getPlatform();
  if (platform !== 'ios') {
    return false;
  }
  return isPluginAvailable();
}
