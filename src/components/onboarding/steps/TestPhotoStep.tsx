
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";

interface TestPhotoStepProps {
  selectedImage: File | null;
  onImageSelect: (file: File | null) => void;
  onImageUpload: () => void;
}

export const TestPhotoStep = ({ selectedImage, onImageSelect, onImageUpload }: TestPhotoStepProps) => {
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
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
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
          className="mb-8"
        >
          <Sparkles className="w-16 h-16 text-orange-400 mx-auto" />
        </motion.div>
        
        <div className="space-y-6 text-center">
          <h2 className="text-3xl font-bold text-white">Let's test it out!</h2>
          <p className="text-white/70 text-lg leading-relaxed max-w-md">
            Upload a photo to get your first style rating and see the magic in action
          </p>
        </div>

        <div className="w-full max-w-sm mt-8">
          <ImageUpload onImageSelect={onImageSelect} />
        </div>
      </div>

      {/* Button Area - Fixed bottom */}
      {selectedImage && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="px-8 pb-8"
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
