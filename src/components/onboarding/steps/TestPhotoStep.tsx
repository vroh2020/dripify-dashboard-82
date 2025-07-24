import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { OnboardingPhotoPicker } from "../OnboardingPhotoPicker";
import { Capacitor } from '@capacitor/core';

interface TestPhotoStepProps {
  selectedImage: File | null;
  onImageSelect: (file: File | null) => void;
  onImageUpload: () => void;
}

export const TestPhotoStep = ({ selectedImage, onImageSelect, onImageUpload }: TestPhotoStepProps) => {
  console.log('🎯 TestPhotoStep render - selectedImage:', selectedImage ? 'FILE PRESENT' : 'NULL');
  console.log('🎯 selectedImage details:', selectedImage ? {
    name: selectedImage.name,
    size: selectedImage.size,
    type: selectedImage.type
  } : 'No file selected');

  // Wrapper function to debug the callback
  const handleImageSelect = (file: File | null) => {
    console.log('🎯 TestPhotoStep - handleImageSelect called with:', file ? {
      name: file.name,
      size: file.size,
      type: file.type
    } : 'NULL');
    console.log('🔄 TestPhotoStep - Calling parent onImageSelect...');
    onImageSelect(file);
    console.log('✅ TestPhotoStep - Parent onImageSelect callback completed');
  };

  // Add handleTakePhoto for Capacitor camera
  const handleTakePhoto = async () => {
    if (!Capacitor?.isNativePlatform?.()) return;
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });
      if (photo?.dataUrl) {
        const res = await fetch(photo.dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'photo.jpg', { type: blob.type });
        handleImageSelect(file);
      }
    } catch (e: any) {
      if (e?.message?.includes('denied') || e?.message?.includes('permission')) {
        alert('Camera access is required to take photos. Please enable camera access in your device Settings.');
      } else {
        alert('An unexpected error occurred while accessing the camera. Please try again or use the photo library.');
      }
    }
  };

  return (
    <motion.div
      key="test-photo"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="h-full flex flex-col"
    >
      {/* Content Area - Centered */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-8">
        <motion.div
          animate={{ 
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mb-6"
        >
          <Sparkles className="w-12 h-12 text-orange-400 mx-auto" />
        </motion.div>
        
        <div className="space-y-4 text-center mb-8">
          <h2 className="text-2xl font-bold text-white">Let's test it out!</h2>
          <p className="text-white/70 text-base leading-relaxed max-w-sm">
            Upload a photo to get your first style rating and see the magic in action
          </p>
        </div>

        {/* Use the new simplified photo picker */}
        <div className="w-full max-w-sm">
          <OnboardingPhotoPicker 
            selectedImage={selectedImage}
            onImageSelect={handleImageSelect} 
          />
          {/* Take Photo button for native platforms */}
          {Capacitor?.isNativePlatform?.() && (
            <Button onClick={handleTakePhoto} className="w-full mt-4 bg-orange-500 text-white">
              Take Photo
            </Button>
          )}
        </div>
      </div>

      {/* Button Area - Fixed bottom */}
      {selectedImage && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="px-6 pb-8"
        >
          <Button
            onClick={onImageUpload}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl"
          >
            <Sparkles className="mr-3 h-5 w-5" />
            Get My Style Rating
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};
