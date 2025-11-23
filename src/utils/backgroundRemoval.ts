import { Capacitor } from '@capacitor/core';

interface BackgroundRemovalPlugin {
  removeBackground(options: { image: string }): Promise<{ image: string; success: boolean }>;
}

const BackgroundRemoval = Capacitor.registerPlugin<BackgroundRemovalPlugin>('BackgroundRemoval');

// DEBUG: Check if plugin is available
console.log('🔍 BackgroundRemoval plugin object:', BackgroundRemoval);
console.log('🔍 Available plugins:', (Capacitor as any).Plugins);

/**
 * Remove background from an image
 * - On iOS: Uses native Vision framework (FREE, FAST, OFFLINE)
 * - On Web/Android: Returns original image (TODO: implement Android or use fallback)
 */
export async function removeImageBackground(imageDataUrl: string): Promise<string> {
  const platform = Capacitor.getPlatform();
  
  console.log('🔍 Platform detected:', platform);
  alert(`Platform: ${platform}`); // VISIBLE DEBUG
  
  if (platform === 'ios') {
    try {
      console.log('🎨 Removing background using iOS Vision framework...');
      alert('🎨 Starting background removal...'); // VISIBLE DEBUG
      
      const result = await BackgroundRemoval.removeBackground({ image: imageDataUrl });
      
      console.log('✅ Background removed successfully (iOS)', result);
      alert('✅ Background removed!'); // VISIBLE DEBUG
      
      return result.image;
    } catch (error) {
      console.error('❌ iOS background removal failed:', error);
      alert(`❌ Error: ${error}`); // VISIBLE DEBUG
      return imageDataUrl; // Fallback to original
    }
  }
  
  // For web/Android, return original for now
  console.log('ℹ️ Background removal not available on this platform, using original image');
  alert('Not iOS - skipping background removal'); // VISIBLE DEBUG
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

