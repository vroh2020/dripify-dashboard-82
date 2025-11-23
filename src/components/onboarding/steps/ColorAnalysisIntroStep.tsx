import { useState } from "react";
import { motion } from "framer-motion";
import { OnboardingLayout } from "../OnboardingLayout";
import { Capacitor } from '@capacitor/core';
import { Logger } from "@/utils/logger";

interface ColorAnalysisIntroStepProps {
  onCapture: (imageFile: File) => void;
  onBack: () => void;
}

export const ColorAnalysisIntroStep = ({ onCapture, onBack }: ColorAnalysisIntroStepProps) => {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleContinue = async () => {
    setIsCapturing(true);
    
    try {
      const isCapacitor = Capacitor?.isNativePlatform?.() || false;
      
      if (!isCapacitor) {
        // Web platform - use file upload with camera preference
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'user'; // Prefer front camera for selfie
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            onCapture(file);
          } else {
            setIsCapturing(false);
          }
        };
        input.click();
        return;
      }

      // Native platform - use Capacitor Camera
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        promptLabelHeader: 'Take a selfie',
        promptLabelCancel: 'Cancel',
        promptLabelPhoto: 'Photo',
      });
      
      if (photo?.dataUrl) {
        const res = await fetch(photo.dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'selfie.jpg', { type: blob.type });
        onCapture(file);
      } else {
        setIsCapturing(false);
      }
    } catch (error) {
      Logger.error('ColorAnalysisIntro', 'Camera error:', error);
      setIsCapturing(false);
    }
  };

  return (
    <OnboardingLayout
      currentStep={6}
      totalSteps={10}
      showBackButton={true}
      onBack={onBack}
      showProgress={false}
    >
      <div className="flex-1 flex flex-col items-center justify-between px-6 py-16 safe-area-inset">
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          {/* Simple illustration of person with phone */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Person head */}
              <circle cx="100" cy="50" r="28" fill="black"/>
              
              {/* Person body */}
              <path d="M 100 78 L 100 130" stroke="black" strokeWidth="3" strokeLinecap="round"/>
              
              {/* Left arm */}
              <path d="M 100 95 L 70 110" stroke="black" strokeWidth="3" strokeLinecap="round"/>
              
              {/* Right arm holding phone */}
              <path d="M 100 95 L 130 105" stroke="black" strokeWidth="3" strokeLinecap="round"/>
              
              {/* Phone in hand */}
              <rect x="125" y="100" width="25" height="40" rx="4" fill="black"/>
              <rect x="128" y="103" width="19" height="30" rx="2" fill="white"/>
              
              {/* Sparkles around phone */}
              <circle cx="155" cy="105" r="2.5" fill="black"/>
              <circle cx="160" cy="115" r="2" fill="black"/>
              <circle cx="152" cy="120" r="1.5" fill="black"/>
              
              {/* Legs */}
              <path d="M 100 130 L 85 165" stroke="black" strokeWidth="3" strokeLinecap="round"/>
              <path d="M 100 130 L 115 165" stroke="black" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </motion.div>

          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center w-full"
          >
            <h1 
              className="text-2xl font-bold text-black mb-3 leading-tight"
              style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 700 }}
            >
              Let's analyze your style profile
            </h1>
            <p 
              className="text-base text-gray-600 leading-relaxed"
              style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}
            >
              Take a quick selfie so we can personalize your experience
            </p>
          </motion.div>
        </div>

        {/* Continue button at bottom with more spacing */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          onClick={handleContinue}
          disabled={isCapturing}
          className="w-full bg-black text-white font-semibold py-5 px-8 rounded-2xl text-base transition-all duration-200 hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mt-8"
          style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 600 }}
        >
          {isCapturing ? "Opening camera..." : "Continue"}
        </motion.button>
      </div>
    </OnboardingLayout>
  );
};

