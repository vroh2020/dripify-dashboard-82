/**
 * Test function for Background Removal Plugin
 * 
 * Usage: Call this function from your app to test background removal
 * 
 * IMPORTANT: Must test on REAL DEVICE (not simulator)
 * - Vision API requires Neural Engine (not available in simulator)
 * - Requires iOS 17.0+
 * - Recommended: iPhone 15 or newer
 */

import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { removeImageBackground, isBackgroundRemovalAvailable } from './backgroundRemoval';

export async function testBackgroundRemoval() {
  try {
    console.log('🧪 Testing background removal plugin...');
    
    // Check platform
    const platform = Capacitor.getPlatform();
    console.log('📱 Platform:', platform);
    
    if (platform !== 'ios') {
      console.warn('⚠️ Background removal only works on iOS');
      return { success: false, error: 'iOS only feature' };
    }
    
    // Check plugin availability
    if (!isBackgroundRemovalAvailable()) {
      console.error('❌ BackgroundRemoval plugin not available!');
      console.error('💡 Make sure you have:');
      console.error('   1. Run: npx cap sync ios');
      console.error('   2. Rebuild app in Xcode');
      console.error('   3. Testing on real device (not simulator)');
      return { success: false, error: 'Plugin not available' };
    }
    
    console.log('✅ Plugin is available');
    
    // Check if running on device (not simulator)
    const isNative = Capacitor.isNativePlatform();
    console.log('📱 Is native platform:', isNative);
    
    if (!isNative) {
      console.warn('⚠️ Testing in browser - plugin may not work');
    }
    
    // Take a photo or select from gallery
    console.log('📸 Opening camera/gallery...');
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,  // Returns data URL (base64)
      source: CameraSource.Photos  // Change to CameraSource.Camera for camera
    });
    
    if (!photo.dataUrl) {
      console.error('❌ No photo data URL returned');
      return { success: false, error: 'No photo data' };
    }
    
    console.log('✅ Photo captured');
    console.log('📦 Photo data size:', photo.dataUrl.length, 'characters');
    console.log('📦 Photo format:', photo.format);
    
    // Try to remove background
    console.log('🎨 Starting background removal...');
    const startTime = Date.now();
    
    const processedImage = await removeImageBackground(photo.dataUrl);
    
    const duration = Date.now() - startTime;
    console.log(`⏱️ Processing took ${duration}ms`);
    
    console.log('✅ Background removal call completed');
      console.log('✅ Processed image received');
      console.log('📦 Processed image size:', processedImage.length, 'characters');
      
      // Check if processing actually occurred
      if (processedImage === photo.dataUrl) {
        console.warn('⚠️ Processed image is same as input (no processing occurred)');
        console.warn('💡 Possible reasons:');
        console.warn('   - Vision API couldn\'t detect objects');
        console.warn('   - Image has low contrast');
        console.warn('   - Testing on simulator (Vision API doesn\'t work in simulator)');
        return {
          success: false,
          error: 'No processing occurred',
          originalSize: photo.dataUrl.length,
          processedSize: processedImage.length
        };
      }
      
      console.log('✅ Background removal successful!');
      console.log('📊 Size change:', {
        original: photo.dataUrl.length,
        processed: processedImage.length,
        difference: processedImage.length - photo.dataUrl.length
      });
      
      return {
        success: true,
        originalImage: photo.dataUrl,
        processedImage: processedImage,
        duration: duration,
        originalSize: photo.dataUrl.length,
        processedSize: processedImage.length
      };
    
  } catch (error) {
    console.error('❌ Error during background removal test:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
    return {
      success: false,
      error: 'Unknown error occurred'
    };
  }
}

/**
 * Quick test - just check if plugin is available
 */
export async function testPluginAvailability() {
  console.log('🔍 Checking plugin availability...');
  
  const platform = Capacitor.getPlatform();
  console.log('📱 Platform:', platform);
  
  const isAvailable = isBackgroundRemovalAvailable();
  
  if (isAvailable) {
    console.log('✅ Plugin is available');
  } else {
    console.error('❌ BackgroundRemoval plugin not available!');
    console.error('💡 Make sure you have:');
    console.error('   1. Run: npx cap sync ios');
    console.error('   2. Rebuild app in Xcode');
    console.error('   3. Testing on real device (not simulator)');
  }
  
  return isAvailable;
}

