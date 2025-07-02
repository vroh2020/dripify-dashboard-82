import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Image as ImageIcon, X, AlertCircle, Sparkles } from "lucide-react";
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
  const previewUrlRef = useRef<string | null>(null);

  // Convert base64 to File object
  const base64ToFile = (base64: string, filename: string): File => {
    try {
      console.log('🔄 Converting base64 to file...');
      
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      const mimeMatch = base64.match(/data:([^;]+);base64,/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const file = new File([bytes], filename, { type: mime });
      console.log('✅ File conversion successful:', file.name, file.size);
      
      return file;
    } catch (error) {
      console.error('❌ Error converting base64 to file:', error);
      throw new Error('Failed to process image data');
    }
  };

  const handleFile = (file: File) => {
    if (isProcessing) return;
    setError("");
    
    console.log('📁 Processing file:', file.name, file.size);

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Only PNG, JPG, JPEG, or WEBP files are allowed.");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size should be less than 10MB");
      return;
    }

    try {
      // Clean up previous preview URL
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      previewUrlRef.current = previewUrl;
      
      setPreview(previewUrl);
      onImageSelect(file);
      
      console.log('✅ File processing complete');
    } catch (error) {
      console.error('❌ Error processing file:', error);
      setError("Failed to process image. Please try again.");
    }
  };

  const selectFromGallery = async () => {
    if (isProcessing) return;
    setError("");
    setIsProcessing(true);

    try {
      if (Capacitor.isNativePlatform()) {
        console.log('📱 Opening native photo library...');
        
        // Check permissions
        const permissions = await CapacitorCamera.checkPermissions();
        console.log('📷 Photo permissions:', permissions);
        
        if (permissions.photos !== 'granted') {
          console.log('🔐 Requesting photo library permission...');
          const requested = await CapacitorCamera.requestPermissions({ permissions: ['photos'] });
          
          if (requested.photos !== 'granted') {
            setError("Photo library permission is required. Please enable it in Settings and try again.");
            setIsProcessing(false);
            return;
          }
        }

        // Select photo from gallery
        const photo = await CapacitorCamera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
          correctOrientation: true,
          width: 1024,
          height: 1024,
          presentationStyle: 'popover'
        });

        if (photo.dataUrl) {
          const file = base64ToFile(photo.dataUrl, `outfit-photo-${Date.now()}.jpg`);
          handleFile(file);
        } else {
          setError("Failed to select photo. Please try again.");
        }
      } else {
        // Web fallback
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const target = e.target as HTMLInputElement;
          if (target.files && target.files[0]) {
            handleFile(target.files[0]);
          }
        };
        input.click();
      }
    } catch (error: any) {
      console.error('📷 Gallery error:', error);
      if (error.message?.includes('User cancelled') || error.message?.includes('cancelled')) {
        console.log('👤 User cancelled photo selection');
      } else {
        setError(`Failed to select photo: ${error.message || 'Please try again.'}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const takePhoto = async () => {
    if (isProcessing) return;
    setError("");
    setIsProcessing(true);

    try {
      if (Capacitor.isNativePlatform()) {
        console.log('📱 Opening native camera...');
        
        // Check permissions
        const permissions = await CapacitorCamera.checkPermissions();
        
        if (permissions.camera !== 'granted') {
          const requested = await CapacitorCamera.requestPermissions({ permissions: ['camera'] });
          
          if (requested.camera !== 'granted') {
            setError("Camera permission is required. Please enable it in Settings and try again.");
            setIsProcessing(false);
            return;
          }
        }

        // Take photo
        const photo = await CapacitorCamera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          correctOrientation: true,
          width: 1024,
          height: 1024,
          presentationStyle: 'popover'
        });

        if (photo.dataUrl) {
          const file = base64ToFile(photo.dataUrl, `camera-photo-${Date.now()}.jpg`);
          handleFile(file);
        } else {
          setError("Failed to capture photo. Please try again.");
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
        setError(`Camera error: ${error.message || 'Please try photo library instead.'}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const clearImage = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    
    setPreview(null);
    onImageSelect(null);
    setError("");
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
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mt-4"
            >
              <p className="text-white/80 text-sm">
                Looking good! Ready to see your style rating?
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
                    Choose your outfit photo
                  </h3>
                  <p className="text-white/50 text-sm max-w-xs">
                    Select a clear, full-body photo to get the most accurate style analysis
                  </p>
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
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    <span>Processing...</span>
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
                PNG, JPG, WEBP • Max 10MB
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm"
        >
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-sm font-medium">
              {error}
            </p>
            <p className="text-red-400/70 text-xs mt-1">
              Make sure the app has permission to access your photos in Settings.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};