import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { OnboardingPhotoPicker } from "../OnboardingPhotoPicker";

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
            Upload a clear photo of your outfit to get your first AI style rating
          </p>
          
          {/* Photo tips */}
          <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
            <h3 className="text-white/80 font-medium text-sm mb-3">📸 For the best results:</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-white/60">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Good lighting</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Full outfit visible</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Clear photo</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>No filters</span>
              </div>
            </div>
          </div>
        </div>

        {/* Use the new simplified photo picker */}
        <div className="w-full max-w-sm">
          <OnboardingPhotoPicker 
            selectedImage={selectedImage}
            onImageSelect={handleImageSelect} 
          />
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
