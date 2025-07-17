import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, Camera } from "lucide-react";
import { OnboardingPhotoPicker } from '../OnboardingPhotoPicker';
import { useState } from 'react';

interface SelfieStepProps {
  onNext: (file: File | null) => void;
}

export const SelfieStep = ({ onNext }: SelfieStepProps) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  return (
    <motion.div
      key="selfie"
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
          <Camera className="w-12 h-12 text-orange-400 mx-auto" />
        </motion.div>
        
        <div className="space-y-4 text-center mb-8">
          <h2 className="text-2xl font-bold text-white">Upload a quick selfie</h2>
          <p className="text-white/70 text-base leading-relaxed max-w-sm">
            This helps us personalize your style recommendations (optional)
          </p>
        </div>

        {/* Photo Picker */}
        <div className="w-full max-w-sm mb-8">
          <OnboardingPhotoPicker 
            selectedImage={selectedImage}
            onImageSelect={setSelectedImage} 
          />
        </div>
      </div>

      {/* Button Area - Fixed bottom */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="px-6 pb-8"
      >
        <Button
          onClick={() => onNext(selectedImage)}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-16 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl"
        >
          <Sparkles className="mr-3 h-5 w-5" />
          {selectedImage ? 'Continue with Photo' : 'Skip for Now'}
        </Button>
      </motion.div>
    </motion.div>
  );
}; 