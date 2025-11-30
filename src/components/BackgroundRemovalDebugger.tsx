import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { removeImageBackground, isBackgroundRemovalAvailable } from '@/utils/backgroundRemoval';
import { useToast } from '@/hooks/use-toast';

export function BackgroundRemovalDebugger() {
  const [status, setStatus] = useState<string>('Ready');
  const [logs, setLogs] = useState<string[]>([]);
  const [testImage, setTestImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const log = (message: string) => {
    console.log(message);
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `${timestamp} - ${message}`]);
  };

  const copyLogs = () => {
    const logText = logs.join('\n');
    navigator.clipboard.writeText(logText).then(() => {
      toast({
        title: "Copied!",
        description: "Logs copied to clipboard",
        variant: "success",
      });
    });
  };

  const clearLogs = () => {
    setLogs([]);
    setTestImage(null);
    setProcessedImage(null);
    setStatus('Ready');
  };

  const checkPlugin = () => {
    log('🔍 Checking plugin availability...');
    const platform = Capacitor.getPlatform();
    log(`Platform: ${platform}`);
    
    const plugins = (Capacitor as any).Plugins;
    const pluginKeys = Object.keys(plugins || {});
    log(`Available plugins: ${pluginKeys.length > 0 ? pluginKeys.join(', ') : 'None found'}`);
    
    const bgPlugin = plugins?.BackgroundRemoval;
    const isAvailable = isBackgroundRemovalAvailable();
    
    if (bgPlugin && isAvailable) {
      log('✅ BackgroundRemoval plugin found!');
      log(`Plugin methods: ${Object.keys(bgPlugin).join(', ')}`);
      setStatus('Plugin is available ✅');
      toast({
        title: "Plugin Found",
        description: "BackgroundRemoval plugin is registered and available",
        variant: "success",
      });
    } else {
      log('❌ BackgroundRemoval plugin NOT found!');
      log('⚠️ Possible issues:');
      log('   - Plugin not registered (run: npx cap sync ios)');
      log('   - App needs to be rebuilt');
      log('   - Wrong platform (iOS only)');
      setStatus('Plugin NOT found ❌');
      toast({
        title: "Plugin Not Found",
        description: "BackgroundRemoval plugin is not available. Check logs for details.",
        variant: "destructive",
      });
    }

    // Check iOS version from user agent
    const ua = navigator.userAgent;
    log(`User agent: ${ua}`);
    
    // Try to detect iOS version
    const iosMatch = ua.match(/OS (\d+)_(\d+)/);
    if (iosMatch) {
      const majorVersion = parseInt(iosMatch[1]);
      const minorVersion = parseInt(iosMatch[2]);
      const iosVersion = `${majorVersion}.${minorVersion}`;
      log(`iOS version detected: ${iosVersion}`);
      
      if (majorVersion < 17) {
        log('⚠️ WARNING: iOS 17.0+ required for background removal!');
        log(`   Current version: ${iosVersion}`);
        toast({
          title: "iOS Version Too Old",
          description: `Background removal requires iOS 17.0+. Your device is running ${iosVersion}`,
          variant: "destructive",
        });
      } else {
        log('✅ iOS version is compatible (17.0+)');
      }
    } else {
      log('⚠️ Could not detect iOS version from user agent');
    }
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

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={copyLogs}
            disabled={logs.length === 0}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-xl px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Copy Logs
          </button>
          <button
            onClick={clearLogs}
            disabled={logs.length === 0}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-xl px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear Logs
          </button>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Troubleshooting Tips</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• <strong>Plugin not found?</strong> Run <code className="bg-gray-200 px-1 rounded">npx cap sync ios</code> then rebuild</li>
            <li>• <strong>No objects detected?</strong> Vision works best with high-contrast photos (dark item on light background)</li>
            <li>• <strong>iOS version?</strong> Requires iOS 17.0+ (check Settings → General → About)</li>
            <li>• <strong>No Xcode?</strong> Use this debugger to see all JavaScript logs. Native Swift logs require Xcode.</li>
            <li>• <strong>Test the plugin</strong> using the buttons above to see detailed error messages</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-2">How to Access This Debugger</h3>
          <p className="text-sm text-gray-600 mb-2">
            Navigate to: <code className="bg-white px-2 py-1 rounded border">/debug/background-removal</code>
          </p>
          <p className="text-sm text-gray-600">
            Or add this to your app URL: <code className="bg-white px-2 py-1 rounded border">your-app-url/debug/background-removal</code>
          </p>
        </div>
      </div>
    </div>
  );
}


