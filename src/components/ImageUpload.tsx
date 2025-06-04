import { useState } from "react";
import { Upload, Camera, Image as ImageIcon, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";

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

  const clearImage = () => {
    setPreview(null);
    setFileName("");
    setIsProcessing(false);
  };

  const openCamera = () => {
    if (isProcessing) return;
    
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
  };

  const openGallery = () => {
    if (isProcessing) return;
    
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
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative w-full"
          >
            <div className="relative bg-gradient-to-r from-white/5 to-white/10 rounded-2xl p-4 border border-white/10">
              <img
                src={preview}
                alt="Selected outfit"
                className="w-full h-64 sm:h-80 object-cover rounded-xl shadow-lg"
              />
              
              {/* Clear button */}
              <Button
                onClick={clearImage}
                size="sm"
                variant="outline"
                className="absolute top-6 right-6 w-8 h-8 p-0 bg-black/50 border-white/20 hover:bg-black/70 rounded-full"
              >
                <X className="w-4 h-4 text-white" />
              </Button>

              {/* File name */}
              {fileName && (
                <div className="mt-3 text-center">
                  <p className="text-white/60 text-sm truncate">{fileName}</p>
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
            <div
              className={cn(
                "relative flex flex-col items-center justify-center w-full h-64 sm:h-80 border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer group",
                dragActive
                  ? "border-orange-400 bg-orange-500/10 scale-[1.02]"
                  : "border-white/20 hover:border-orange-400/50 bg-gradient-to-br from-white/5 to-white/10 hover:bg-orange-500/5",
                isProcessing ? "pointer-events-none opacity-50" : ""
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={!isProcessing ? openGallery : undefined}
            >
              <motion.div
                className="flex flex-col items-center justify-center text-center space-y-4"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <div className="relative">
                  <motion.div
                    animate={dragActive ? { scale: 1.2, rotate: 5 } : { scale: 1, rotate: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ImageIcon className="w-16 h-16 text-orange-400" />
                  </motion.div>
                  <motion.div
                    className="absolute -top-2 -right-2"
                    animate={dragActive ? { scale: 1.3 } : { scale: 1 }}
                  >
                    <Upload className="w-6 h-6 text-orange-400" />
                  </motion.div>
                </div>
                <div className="space-y-2">
                  <p className="text-white font-medium text-lg">
                    {isProcessing ? "Processing..." : dragActive ? "Drop your photo here!" : "Upload your outfit photo"}
                  </p>
                  <p className="text-white/60 text-sm leading-relaxed">
                    {isProcessing ? "Please wait..." : isMobile ? "Tap to select from gallery" : "Click to browse or drag & drop"}
                  </p>
                  <p className="text-white/40 text-xs">
                    PNG, JPG, WEBP • Max 10MB
                  </p>
                </div>
              </motion.div>
            </div>
            {/* Take a Photo Button */}
            <div className="flex justify-center mt-4 gap-3">
              <Button
                onClick={openGallery}
                disabled={isProcessing}
                className="bg-gray-800 border border-white/20 text-white hover:bg-gray-900 h-10 text-sm font-medium rounded-lg px-4"
              >
                <ImageIcon className="w-4 h-4 mr-2" /> Gallery
              </Button>
              <Button
                onClick={openCamera}
                disabled={isProcessing}
                className="bg-gray-800 border border-white/20 text-white hover:bg-gray-900 h-10 text-sm font-medium rounded-lg px-4"
              >
                <Camera className="w-4 h-4 mr-2" /> Take Photo
              </Button>
            </div>
            {/* Error Message */}
            {error && (
              <div className="flex items-center justify-center mt-3 text-red-400 bg-red-900/20 rounded-lg px-3 py-2 text-sm">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};