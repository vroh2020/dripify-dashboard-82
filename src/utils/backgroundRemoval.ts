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
      
      // Handle both imageData (from Swift) and image (fallback)
      const processedImage = result.imageData || result.image;
      
      if (processedImage && result.success !== false) {
        // Verify the result is different from input (actual processing occurred)
        if (processedImage !== imageDataUrl) {
          console.log('✅ Background removed successfully (iOS 17+)');
          console.log('📦 Processed image size:', processedImage.length, 'characters');
          return processedImage;
        } else {
          console.warn('⚠️ Background removal returned original image (no processing occurred)');
          const errorMsg = result.error || 'No processing occurred';
          console.warn('Error:', errorMsg);
          return imageDataUrl;
        }
      } else {
        const errorMsg = result.error || 'Unknown error';
        console.warn('⚠️ Background removal failed:', errorMsg);
        console.log('ℹ️ Using original image without background removal');
        return imageDataUrl;
      }
    } catch (error) {
      console.error('❌ iOS background removal threw exception:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      return imageDataUrl; // Fallback to original
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
          // Fallback: return original blob
          resolve(blob);
        }
      } catch (error) {
        console.error('❌ Error processing image:', error);
        // Fallback: return original blob
        resolve(blob);
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
