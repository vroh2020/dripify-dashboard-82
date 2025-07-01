import { useState } from "react";
import { Upload, Camera, Image as ImageIcon, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from '@capacitor/core';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
}

export const ImageUpload = ({ onImageSelect }: ImageUploadProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");
  const isMobile = useIsMobile();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (isProcessing) return;
    setError("");

    // Validate file type (no GIFs, only PNG, JPG, JPEG, WEBP)
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Only PNG, JPG, JPEG, or WEBP files are allowed. GIFs are not supported.");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size should be less than 10MB");
      return;
    }

    setIsProcessing(true);
    setPreview(URL.createObjectURL(file));
    setFileName(file.name);
    onImageSelect(file);
    setTimeout(() => {
      setIsProcessing(false);
    }, 1000);
  };

  // Convert base64 to File object with better error handling
  const base64ToFile = (base64: string, filename: string): File => {
    try {
      const arr = base64.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, { type: mime });
    } catch (error) {
      console.error('Error converting base64 to file:', error);
      throw new Error('Failed to process image data');
    }
  };

  const openCamera = async () => {
    if (isProcessing) return;
    setError("");

    try {
      if (Capacitor.isNativePlatform()) {
        // Request permissions first
        const permissions = await CapacitorCamera.checkPermissions();
        if (permissions.camera !== 'granted') {
          const requested = await CapacitorCamera.requestPermissions();
          if (requested.camera !== 'granted') {
            setError("Camera permission required to take photos.");
            return;
          }
        }

        // Use native camera with proper settings
        const photo = await CapacitorCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          correctOrientation: true,
          width: 1920,
          height: 1920,
        });

        if (photo.dataUrl) {
          const file = base64ToFile(photo.dataUrl, `camera-photo-${Date.now()}.jpg`);
          handleFile(file);
        } else {
          setError("Failed to capture photo. Please try again.");
        }
      } else {
        // Web fallback with proper constraints
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
      console.error('Camera error:', error);
      if (error.message?.includes('User cancelled')) {
        // User cancelled, don't show error
        return;
      }
      setError("Camera not available. Please use photo library instead.");
    }
  };

  const openGallery = async () => {
    if (isProcessing) return;
    setError("");

    try {
      if (Capacitor.isNativePlatform()) {
        // Request permissions first
        const permissions = await CapacitorCamera.checkPermissions();
        if (permissions.photos !== 'granted') {
          const requested = await CapacitorCamera.requestPermissions();
          if (requested.photos !== 'granted') {
            setError("Photo library permission required to select photos.");
            return;
          }
        }

        // Use native photo library with proper settings
        const photo = await CapacitorCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
          correctOrientation: true,
          width: 1920,
          height: 1920,
        });

        if (photo.dataUrl) {
          const file = base64ToFile(photo.dataUrl, `gallery-photo-${Date.now()}.jpg`);
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
      console.error('Gallery error:', error);
      if (error.message?.includes('User cancelled')) {
        // User cancelled, don't show error
        return;
      }
      setError("Could not access photo library. Please try again.");
    }
  };

  const clearImage = () => {
    setPreview(null);
    setFileName("");
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative w-full"
          >
            <div className="relative bg-black/20 rounded-3xl p-1 border border-white/10">
              <img
                src={preview}
                alt="Selected outfit"
                className="w-full h-80 object-cover rounded-3xl shadow-2xl"
              />
              
              {/* Clear button */}
              <Button
                onClick={clearImage}
                size="sm"
                variant="outline"
                className="absolute top-4 right-4 w-10 h-10 p-0 bg-black/60 border-white/20 hover:bg-black/80 rounded-full backdrop-blur-md"
              >
                <X className="w-5 h-5 text-white" />
              </Button>

              {/* File name */}
              {fileName && (
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-black/60 backdrop-blur-md rounded-xl px-3 py-2">
                    <p className="text-white/90 text-sm truncate">{fileName}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative"
          >
            {/* Modern Camera Interface */}
            <div className="relative w-full h-80 bg-gradient-to-br from-gray-900/50 to-black/50 rounded-3xl border-2 border-dashed border-white/20 overflow-hidden">
              {/* Viewfinder overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Camera viewfinder frame */}
                  <div className="w-64 h-64 border-2 border-white/30 rounded-xl relative">
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-orange-400"></div>
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-orange-400"></div>
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-orange-400"></div>
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-orange-400"></div>
                    
                    {/* Center content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="text-white/60 mb-3"
                      >
                        <ImageIcon className="w-12 h-12 mx-auto" />
                      </motion.div>
                      <p className="text-white/80 font-medium text-lg mb-1">
                        Upload your outfit photo
                      </p>
                      <p className="text-white/50 text-sm">
                        Tap to select from gallery
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload overlay */}
              <div
                className={cn(
                  "absolute inset-0 cursor-pointer transition-all duration-300",
                  dragActive ? "bg-orange-500/20" : "hover:bg-white/5"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={!isProcessing ? openGallery : undefined}
              />
            </div>

            {/* Action buttons row */}
            <div className="flex flex-col items-center space-y-4 mt-6">
              {/* Primary Gallery Button - Larger */}
              <Button
                onClick={openGallery}
                disabled={isProcessing}
                className="w-full max-w-[280px] bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 h-14 text-lg font-semibold rounded-xl shadow-lg"
              >
                <ImageIcon className="w-6 h-6 mr-3" />
                Choose from Gallery
              </Button>
              
              {/* Secondary Camera Button - Smaller */}
              <Button
                onClick={openCamera}
                disabled={isProcessing}
                variant="outline"
                className="w-full max-w-[200px] bg-white/10 border-white/20 text-white hover:bg-white/20 h-12 rounded-xl backdrop-blur-md"
              >
                <Camera className="w-5 h-5 mr-2" />
                Take Photo
              </Button>
            </div>

            {/* Format info */}
            <div className="text-center mt-4">
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
          className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
        >
          <AlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
        </motion.div>
      )}
    </div>
  );
};