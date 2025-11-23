import { Capacitor } from '@capacitor/core';

interface BackgroundRemovalPlugin {
  removeBackground(options: { image: string }): Promise<{ image: string; success: boolean }>;
}

const BackgroundRemoval = Capacitor.registerPlugin<BackgroundRemovalPlugin>('BackgroundRemoval');

/**
 * Remove background from an image
 * - On iOS: Uses native Vision framework (FREE, FAST, OFFLINE)
 * - On Web/Android: Returns original image (TODO: implement Android or use fallback)
 */
export async function removeImageBackground(imageDataUrl: string): Promise<string> {
  const platform = Capacitor.getPlatform();
  
  if (platform === 'ios') {
    try {
      console.log('🎨 Removing background using iOS Vision framework...');
      const result = await BackgroundRemoval.removeBackground({ image: imageDataUrl });
      console.log('✅ Background removed successfully (iOS)');
      return result.image;
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

