import { useState } from "react";
import { motion } from "framer-motion";
import { OnboardingLayout } from "../OnboardingLayout";
import { Box, Package, PackageOpen, Boxes } from "lucide-react";

interface ClosetSizeStepProps {
  onNext: (closetSize: string) => void;
  onBack: () => void;
}

const CLOSET_SIZES = [
  {
    id: "capsule",
    text: "Capsule wardrobe (20-50 items)",
    icon: Box
  },
  {
    id: "average",
    text: "Average closet (50-100 items)",
    icon: Package
  },
  {
    id: "full",
    text: "Full closet (100-200 items)",
    icon: PackageOpen
  },
  {
    id: "overflowing",
    text: "Overflowing (200+ items)",
    icon: Boxes
  }
];

export const ClosetSizeStep = ({ onNext, onBack }: ClosetSizeStepProps) => {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const handleSelection = (sizeId: string) => {
    setSelectedSize(sizeId);
    
    // Auto-advance after selection with delay
    setTimeout(() => {
      const selectedSizeData = CLOSET_SIZES.find(s => s.id === sizeId);
      onNext(selectedSizeData?.text || sizeId);
    }, 300);
  };

  return (
    <OnboardingLayout
      currentStep={4}
      totalSteps={10}
      showBackButton={true}
      onBack={onBack}
    >
      <div className="flex-1 flex flex-col px-6 py-12 safe-area-inset">
        <div className="mb-16">
          <h1 className="text-3xl font-bold text-black leading-tight" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 700 }}>
            How big is your wardrobe?
          </h1>
        </div>

        <div className="space-y-5">
          {CLOSET_SIZES.map((size, index) => {
            const IconComponent = size.icon;
            return (
              <motion.button
                key={size.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                onClick={() => handleSelection(size.id)}
                className={`w-full flex items-center gap-5 p-6 rounded-2xl border transition-all duration-150 ${
                  selectedSize === size.id 
                    ? 'border-2 border-black bg-white shadow-sm' 
                    : 'border border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <IconComponent 
                  size={28} 
                  className={selectedSize === size.id ? 'text-black' : 'text-gray-500'} 
                  strokeWidth={2}
                />
                <span 
                  className="text-base text-left flex-1 text-black"
                  style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 500 }}
                >
                  {size.text}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </OnboardingLayout>
  );
};
