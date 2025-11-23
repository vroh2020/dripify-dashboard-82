/**
 * Quick test utility to verify BackgroundRemoval plugin works
 * Run this in browser console on iOS device to test
 */
export async function testBackgroundRemovalPlugin() {
  const { Capacitor } = await import('@capacitor/core');
  
  console.log('🧪 Testing BackgroundRemoval Plugin...');
  console.log('Platform:', Capacitor.getPlatform());
  
  // Check if plugin is registered
  const plugin = (Capacitor as any).Plugins?.BackgroundRemoval;
  
  if (!plugin) {
    console.error('❌ Plugin not found! Run: npx cap sync ios');
    return false;
  }
  
  console.log('✅ Plugin found:', plugin);
  
  // Create a simple test image (red square)
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, 100, 100);
  
  const testImage = canvas.toDataURL();
  console.log('📸 Test image created');
  
  try {
    console.log('🎨 Calling removeBackground...');
    const startTime = Date.now();
    
    const result = await plugin.removeBackground({ image: testImage });
    
    const duration = Date.now() - startTime;
    console.log(`✅ Success! Took ${duration}ms`);
    console.log('Result:', result);
    
    // Verify result has image
    if (result?.image && result.image.startsWith('data:image')) {
      console.log('✅ Result image is valid base64');
      return true;
    } else {
      console.error('❌ Invalid result format');
      return false;
    }
  } catch (error: any) {
    console.error('❌ Plugin call failed:', error);
    console.error('Error details:', error.message);
    return false;
  }
}

// Auto-run test if in development
if (import.meta.env.DEV) {
  // Uncomment to auto-test on load:
  // testBackgroundRemovalPlugin();
}

