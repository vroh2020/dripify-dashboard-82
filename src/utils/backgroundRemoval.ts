import { Capacitor } from '@capacitor/core';

interface BackgroundRemovalPlugin {
  removeBackground(options: { image: string }): Promise<{ image: string; success: boolean }>;
}

const BackgroundRemoval = Capacitor.registerPlugin<BackgroundRemovalPlugin>('BackgroundRemoval');

/**
 * Remove background from an image
 * - On iOS 17+: Uses Vision framework for generic object removal (clothing, etc)
 * - On iOS 15-16: Not supported for objects, returns original
 * - On Web/Android: Returns original image
 */
export async function removeImageBackground(imageDataUrl: string): Promise<string> {
  const platform = Capacitor.getPlatform();
  
  console.log('🔍 Platform detected:', platform);
  
  if (platform === 'ios') {
    try {
      console.log('🎨 Attempting background removal using iOS Vision framework...');
      
      const result = await BackgroundRemoval.removeBackground({ image: imageDataUrl });
      
      if (result.success) {
        console.log('✅ Background removed successfully (iOS 17+)');
        return result.image;
      } else {
        console.log('ℹ️ Background removal not available (requires iOS 17+), using original image');
        return imageDataUrl;
      }
    } catch (error) {
      console.error('❌ iOS background removal failed:', error);
      return imageDataUrl; // Fallback to original
    }
  }
  
  // For web/Android, return original for now
  console.log('ℹ️ Background removal not available on this platform, using original image');
  return imageDataUrl;
}

/**
 * Remove background from a Blob
 */
export async function removeBackgroundFromBlob(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      const processedDataUrl = await removeImageBackground(dataUrl);
      
      // Convert back to Blob
      fetch(processedDataUrl)
        .then(res => res.blob())
        .then(resolve)
        .catch(reject);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

