import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Image as ImageIcon, X, AlertCircle, Sparkles, RefreshCw, Settings } from "lucide-react";
import { Capacitor } from '@capacitor/core';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { cn } from "@/lib/utils";

interface OnboardingPhotoPickerProps {
  onImageSelect: (file: File | null) => void;
  selectedImage: File | null;
}

export const OnboardingPhotoPicker = ({ onImageSelect, selectedImage }: OnboardingPhotoPickerProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const previewUrlRef = useRef<string | null>(null);

  // Convert base64 to File object with enhanced error handling
  const base64ToFile = (base64: string, filename: string): File => {
    try {
      console.log('🔄 Converting base64 to file...', base64.substring(0, 50) + '...');
      
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      const mimeMatch = base64.match(/data:([^;]+);base64,/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      
      console.log('📋 Detected MIME type:', mime);
      
      // Validate base64 string
      if (!base64Data || base64Data.length === 0) {
        throw new Error('Invalid base64 data received');
      }

      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const file = new File([bytes], filename, { type: mime });
      
      // Validate created file
      if (file.size === 0) {
        throw new Error('Generated file is empty');
      }
      
      console.log('✅ File created successfully:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      return file;
    } catch (error) {
      console.error('❌ Error converting base64 to file:', error);
      throw new Error('Failed to process photo data. Please try again.');
    }
  };

  const handleFile = (file: File) => {
    if (isProcessing) return;
    setError("");
    setPermissionDenied(false);
    
    console.log('📁 Processing file:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Enhanced file validation
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please select a PNG, JPG, JPEG, or WEBP image file.");
      return;
    }

    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError("Image size must be less than 10MB. Please choose a smaller image.");
      return;
    }

    // Check for minimum file size (avoid corrupted files)
    if (file.size < 1024) {
      setError("Image appears to be corrupted. Please try a different photo.");
      return;
    }

    try {
      setIsProcessing(true);
      
      // Clean up previous preview URL
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      previewUrlRef.current = previewUrl;
      
      console.log('🖼️ Preview URL created:', previewUrl);
      
      setPreview(previewUrl);
      onImageSelect(file);
      setRetryCount(0); // Reset retry count on success
      
      console.log('✅ File processing complete - notifying parent component');
    } catch (error) {
      console.error('❌ Error processing file:', error);
      setError("Failed to process photo. Please try again.");
    } finally {
      setTimeout(() => setIsProcessing(false), 500);
    }
  };

  const selectFromGallery = async () => {
    if (isProcessing) return;
    setError("");
    setPermissionDenied(false);
    setIsProcessing(true);

    console.log('📱 Starting photo library selection...');

    try {
      if (Capacitor.isNativePlatform()) {
        console.log('📱 Using native photo library...');
        
        // Check permissions first
        const permissions = await CapacitorCamera.checkPermissions();
        console.log('📷 Current permissions:', permissions);
        
        if (permissions.photos !== 'granted') {
          console.log('🔐 Requesting photo library permission...');
          const requested = await CapacitorCamera.requestPermissions({ permissions: ['photos'] });
          console.log('📝 Permission request result:', requested);
          
          if (requested.photos !== 'granted') {
            setPermissionDenied(true);
            setError("Photo library access is required to select photos. Please grant permission in your device Settings and try again.");
            setIsProcessing(false);
            return;
          }
        }

        console.log('📸 Opening photo library with getPhoto...');
        
        // Use native photo library with optimized settings
        const photo = await CapacitorCamera.getPhoto({
          quality: 90, // Higher quality for better analysis
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
          correctOrientation: true,
          width: 1200, // Increased for better quality
          height: 1200,
          presentationStyle: 'popover'
        });

        console.log('📸 Photo library result:', {
          hasDataUrl: !!photo.dataUrl,
          hasPath: !!photo.path,
          hasWebPath: !!photo.webPath,
          format: photo.format
        });

        if (photo.dataUrl) {
          console.log('✅ Photo selected successfully, converting to file...');
          const file = base64ToFile(photo.dataUrl, `outfit-photo-${Date.now()}.jpg`);
          handleFile(file);
        } else {
          console.error('❌ No photo data received from native picker');
          setError("Unable to load the selected photo. Please try again or choose a different image.");
        }
      } else {
        console.log('🌐 Using web file picker...');
        // Web fallback
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const target = e.target as HTMLInputElement;
          if (target.files && target.files[0]) {
            console.log('📁 File selected from web picker:', target.files[0].name);
            handleFile(target.files[0]);
          }
        };
        input.click();
      }
    } catch (error: any) {
      console.error('📷 Photo library error:', error);
      
      if (error.message?.includes('User cancelled') || error.message?.includes('cancelled')) {
        console.log('👤 User cancelled photo selection');
        // Don't show error for user cancellation
      } else {
        console.error('📷 Actual error occurred:', error.message);
        
        // Provide specific error messages based on error type
        let errorMessage = "Failed to access photo library. ";
        
        if (error.message?.includes('permission')) {
          setPermissionDenied(true);
          errorMessage = "Photo library permission is required. Please enable it in Settings and try again.";
        } else if (error.message?.includes('not available')) {
          errorMessage = "Photo library is not available on this device. Please try taking a new photo instead.";
        } else {
          errorMessage += "Please try again or take a new photo.";
        }
        
        setError(errorMessage);
      }
    } finally {
      console.log('🏁 Photo selection process finished');
      setIsProcessing(false);
    }
  };

  const takePhoto = async () => {
    if (isProcessing) return;
    setError("");
    setPermissionDenied(false);
    setIsProcessing(true);

    try {
      if (Capacitor.isNativePlatform()) {
        console.log('📱 Opening native camera...');
        
        // Check camera permissions
        const permissions = await CapacitorCamera.checkPermissions();
        
        if (permissions.camera !== 'granted') {
          const requested = await CapacitorCamera.requestPermissions({ permissions: ['camera'] });
          
          if (requested.camera !== 'granted') {
            setPermissionDenied(true);
            setError("Camera access is required to take photos. Please grant permission in your device Settings and try again.");
            setIsProcessing(false);
            return;
          }
        }

        // Take photo with optimized settings
        const photo = await CapacitorCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          correctOrientation: true,
          width: 1200,
          height: 1200,
          presentationStyle: 'popover'
        });

        if (photo.dataUrl) {
          const file = base64ToFile(photo.dataUrl, `camera-photo-${Date.now()}.jpg`);
          handleFile(file);
        } else {
          setError("Unable to capture photo. Please try again or select from gallery.");
        }
      } else {
        // Web fallback
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = (e) => {
          const target = e.target as HTMLInputElement;
          if (target.files && target.files[0]) {
            handleFile(target.files[0]);
          }
        };
        input.click();
      }
    } catch (error: any) {
      console.error('📷 Camera error:', error);
      if (error.message?.includes('User cancelled') || error.message?.includes('cancelled')) {
        console.log('👤 User cancelled camera');
      } else {
        let errorMessage = "Camera error occurred. ";
        
        if (error.message?.includes('permission')) {
          setPermissionDenied(true);
          errorMessage = "Camera permission is required. Please enable it in Settings and try again.";
        } else if (error.message?.includes('not available')) {
          errorMessage = "Camera is not available on this device. Please select a photo from your gallery instead.";
        } else {
          errorMessage += "Please try selecting from gallery instead.";
        }
        
        setError(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const clearImage = () => {
    console.log('🗑️ Clearing selected image...');
    
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    
    setPreview(null);
    onImageSelect(null);
    setError("");
    setPermissionDenied(false);
    setRetryCount(0);
  };

  const retryAction = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      setError("");
      setPermissionDenied(false);
      // Automatically retry gallery selection
      selectFromGallery();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full space-y-6">
      <AnimatePresence mode="wait">
        {preview ? (
          // Preview mode
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <div className="relative bg-white/5 rounded-2xl p-3 border border-white/10 backdrop-blur-sm">
              <img
                src={preview}
                alt="Selected outfit"
                className="w-full h-72 object-cover rounded-xl shadow-lg"
              />
              
              <Button
                onClick={clearImage}
                size="sm"
                variant="outline"
                className="absolute top-5 right-5 w-8 h-8 p-0 bg-black/60 border-white/20 hover:bg-black/80 rounded-full"
              >
                <X className="w-4 h-4 text-white" />
              </Button>
              
              {/* Photo quality indicator */}
              <div className="absolute top-5 left-5">
                <div className="bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1">
                  <span className="text-green-300 text-xs font-medium">✓ Ready</span>
                </div>
              </div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mt-4"
            >
              <p className="text-white/80 text-sm">
                Perfect! This photo looks great for analysis.
              </p>
            </motion.div>
          </motion.div>
        ) : (
          // Upload mode
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Upload placeholder */}
            <div className="relative w-full h-72 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center backdrop-blur-sm">
              <div className="text-center space-y-4">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <ImageIcon className="w-16 h-16 text-white/40 mx-auto" />
                </motion.div>
                
                <div className="space-y-2">
                  <h3 className="text-white/80 font-medium text-lg">
                    Upload your outfit photo
                  </h3>
                  <p className="text-white/50 text-sm max-w-xs mx-auto">
                    For best results, use a clear, full-body photo with good lighting
                  </p>
                </div>
                
                {/* Tips */}
                <div className="text-xs text-white/40 space-y-1">
                  <div>📱 Stand in good lighting</div>
                  <div>👕 Show your full outfit</div>
                  <div>📸 Keep the camera steady</div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              {/* Primary button - Gallery */}
              <Button
                onClick={selectFromGallery}
                disabled={isProcessing}
                className={cn(
                  "w-full h-14 text-lg font-semibold rounded-xl transition-all duration-300",
                  "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
                  "shadow-lg hover:shadow-xl hover:scale-[1.02]",
                  isProcessing && "opacity-75 cursor-not-allowed"
                )}
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-6 h-6" />
                    <span>Choose from Gallery</span>
                  </div>
                )}
              </Button>

              {/* Secondary button - Camera */}
              <Button
                onClick={takePhoto}
                disabled={isProcessing}
                variant="outline"
                className="w-full h-12 text-base font-medium rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
              >
                <Camera className="w-5 h-5 mr-2" />
                Take New Photo
              </Button>
            </div>

            {/* Helper text */}
            <div className="text-center">
              <p className="text-white/40 text-xs">
                PNG, JPG, WEBP • Max 10MB • For best results use good lighting
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 text-sm font-medium">
                {error}
              </p>
              
              {permissionDenied && (
                <div className="mt-3 space-y-2">
                  <p className="text-red-400/70 text-xs">
                    To enable permissions:
                  </p>
                  <ul className="text-red-400/70 text-xs space-y-1 ml-4">
                    <li>• Go to device Settings</li>
                    <li>• Find this app</li>
                    <li>• Enable Camera and Photo permissions</li>
                    <li>• Return and try again</li>
                  </ul>
                </div>
              )}
              
              {!permissionDenied && retryCount < 3 && (
                <Button
                  onClick={retryAction}
                  variant="outline"
                  size="sm"
                  className="mt-3 h-8 px-3 bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Try Again
                </Button>
              )}
            </div>
            
            {permissionDenied && (
              <Button
                onClick={() => {
                  // This would open settings if we had that capability
                  setError("Please manually enable permissions in your device Settings.");
                }}
                variant="outline"
                size="sm"
                className="bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
              >
                <Settings className="w-3 h-3" />
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};