import { Capacitor } from '@capacitor/core';

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
    
    // Try to access the plugin
    const plugins = (Capacitor as any).Plugins;
    return plugins && typeof plugins.BackgroundRemoval !== 'undefined';
  } catch (error) {
    console.warn('⚠️ Error checking plugin availability:', error);
    return false;
  }
}

// Register the plugin
const BackgroundRemoval = Capacitor.registerPlugin<BackgroundRemovalPlugin>('BackgroundRemoval');

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
        return imageDataUrl;
      }
      
      const result = await BackgroundRemoval.removeBackground({ image: imageDataUrl });
      
      console.log('📥 Plugin response received:', {
        hasImageData: !!result.imageData,
        hasImage: !!result.image,
        success: result.success,
        error: result.error,
        imageDataLength: result.imageData?.length || 0,
        imageLength: result.image?.length || 0,
        originalLength: imageDataUrl.length
      });
      
      // Handle both imageData (from Swift) and image (fallback)
      const processedImage = result.imageData || result.image;
      
      // CRITICAL: Check if we got an error message
      if (result.error) {
        console.error('❌ Background removal error from plugin:', result.error);
        console.error('This means Vision framework could not detect objects in your image');
        console.error('Common reasons:');
        console.error('  1. Flat clothing items (Vision works better with 3D objects)');
        console.error('  2. Low contrast between item and background');
        console.error('  3. Similar colors between item and background');
        console.error('  4. Item too small or unclear in photo');
        throw new Error(result.error); // Throw so we can catch and show user
      }
      
      if (!processedImage) {
        console.error('❌ No image data in plugin response');
        console.error('Full result:', JSON.stringify(result, null, 2));
        throw new Error('Plugin returned no image data');
      }
      
      // Check if success is explicitly false
      if (result.success === false) {
        const errorMsg = result.error || 'Background removal failed - Vision could not detect objects';
        console.error('❌ Plugin returned success: false');
        console.error('Error message:', errorMsg);
        throw new Error(errorMsg);
      }
      
      // Verify the result is different from input (actual processing occurred)
      if (processedImage === imageDataUrl) {
        const errorMsg = result.error || 'No processing occurred - Vision may not have detected objects';
        console.warn('⚠️ Background removal returned original image (no processing occurred)');
        console.warn('This means Vision framework could not identify the clothing item');
        console.warn('Error:', errorMsg);
        throw new Error(errorMsg);
      }
      
      // Success!
      console.log('✅ Background removed successfully (iOS 17+)');
      console.log('📦 Original size:', imageDataUrl.length, 'characters');
      console.log('📦 Processed size:', processedImage.length, 'characters');
      console.log('📊 Size change:', ((processedImage.length - imageDataUrl.length) / imageDataUrl.length * 100).toFixed(1) + '%');
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
