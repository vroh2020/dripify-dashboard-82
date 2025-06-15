
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
      className="flex flex-col justify-between h-full text-center"
    >
      <div className="flex-1 flex flex-col justify-center space-y-6">
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
        >
          <Sparkles className="w-16 h-16 text-orange-400 mx-auto" />
        </motion.div>
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-white">Let's test it out!</h2>
          <p className="text-white/70 text-base leading-relaxed px-2">
            Upload a photo to get your first style rating and see the magic in action
          </p>
        </div>

        <div className="px-2">
          <ImageUpload onImageSelect={onImageSelect} />
        </div>
      </div>

      {selectedImage && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="pb-4"
        >
          <Button
            onClick={onImageUpload}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-14 text-base font-bold rounded-xl transition-all duration-300 hover:scale-105 shadow-2xl"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Get My Style Rating
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};
