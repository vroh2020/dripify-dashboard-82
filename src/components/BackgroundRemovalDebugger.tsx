import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { removeImageBackground } from '@/utils/backgroundRemoval';

export function BackgroundRemovalDebugger() {
  const [status, setStatus] = useState<string>('Ready');
  const [logs, setLogs] = useState<string[]>([]);
  const [testImage, setTestImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);

  const log = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  const checkPlugin = () => {
    log('🔍 Checking plugin availability...');
    const platform = Capacitor.getPlatform();
    log(`Platform: ${platform}`);
    
    const plugins = (Capacitor as any).Plugins;
    log(`Available plugins: ${Object.keys(plugins).join(', ')}`);
    
    const bgPlugin = plugins.BackgroundRemoval;
    if (bgPlugin) {
      log('✅ BackgroundRemoval plugin found!');
      log(`Plugin methods: ${Object.keys(bgPlugin).join(', ')}`);
    } else {
      log('❌ BackgroundRemoval plugin NOT found!');
      log('⚠️ You need to rebuild the iOS app in Xcode');
    }

    // Check iOS version
    const ua = navigator.userAgent;
    log(`User agent: ${ua}`);
  };

  const testWithSampleImage = async () => {
    setStatus('Testing...');
    log('🧪 Creating test image...');
    
    // Create a simple colored square as test image
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    
    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 200, 200);
    
    // Red square in center
    ctx.fillStyle = 'red';
    ctx.fillRect(50, 50, 100, 100);
    
    const dataUrl = canvas.toDataURL('image/png');
    setTestImage(dataUrl);
    log(`✅ Test image created (${dataUrl.length} chars)`);
    
    try {
      log('🎨 Calling background removal...');
      const result = await removeImageBackground(dataUrl);
      
      if (result === dataUrl) {
        log('⚠️ Received original image back (no processing)');
        setStatus('Failed - no processing occurred');
      } else {
        log('✅ Background removal returned different image!');
        log(`Result size: ${result.length} chars`);
        setProcessedImage(result);
        setStatus('Success!');
      }
    } catch (error) {
      log(`❌ Error: ${error}`);
      setStatus(`Error: ${error}`);
    }
  };

  const testWithRealImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      log(`📸 Selected image: ${file.name} (${file.size} bytes)`);
      setStatus('Processing real image...');
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setTestImage(dataUrl);
        log(`✅ Image loaded (${dataUrl.length} chars)`);
        
        try {
          log('🎨 Starting background removal...');
          const startTime = Date.now();
          const result = await removeImageBackground(dataUrl);
          const duration = Date.now() - startTime;
          
          log(`⏱️ Processing took ${duration}ms`);
          
          if (result === dataUrl) {
            log('⚠️ Received original image back (no processing)');
            log('💡 Vision may not have detected any objects');
            setStatus('No objects detected - try a photo with clear contrast');
          } else {
            log('✅ Background removed successfully!');
            log(`Result size: ${result.length} chars`);
            setProcessedImage(result);
            setStatus('Success!');
          }
        } catch (error) {
          log(`❌ Error: ${error}`);
          setStatus(`Error: ${error}`);
        }
      };
      
      reader.readAsDataURL(file);
    };
    
    input.click();
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Background Removal Debugger</h1>
          <p className="text-sm text-gray-600 mt-1">Status: {status}</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={checkPlugin}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl px-4 py-3 transition-colors"
          >
            1. Check Plugin Registration
          </button>

          <button
            onClick={testWithSampleImage}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl px-4 py-3 transition-colors"
          >
            2. Test with Simple Shape
          </button>

          <button
            onClick={testWithRealImage}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl px-4 py-3 transition-colors"
          >
            3. Test with Your Photo
          </button>
        </div>

        {/* Images */}
        <div className="grid grid-cols-2 gap-4">
          {testImage && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Original</p>
              <img src={testImage} alt="Original" className="w-full border border-gray-300 rounded-xl" />
            </div>
          )}
          {processedImage && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Processed</p>
              <img 
                src={processedImage} 
                alt="Processed" 
                className="w-full border border-gray-300 rounded-xl"
                style={{ backgroundColor: '#333' }}
              />
            </div>
          )}
        </div>

        {/* Logs */}
        <div className="border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Console Logs</h3>
          <div className="bg-gray-900 text-green-400 font-mono text-xs p-3 rounded-lg max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Click buttons above to start testing.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Troubleshooting Tips</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• <strong>Plugin not found?</strong> Rebuild the app in Xcode (Cmd+B)</li>
            <li>• <strong>No objects detected?</strong> Vision API works best with 3D objects, not flat clothing</li>
            <li>• <strong>iOS version?</strong> Requires iOS 17.0+</li>
            <li>• <strong>Check Xcode console</strong> for native Swift logs</li>
          </ul>
        </div>
      </div>
    </div>
  );
}


