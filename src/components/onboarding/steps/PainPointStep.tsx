import { useState } from "react";
import { motion } from "framer-motion";
import { OnboardingLayout } from "../OnboardingLayout";
import { Clock, Brain, HelpCircle, ShoppingBag } from "lucide-react";

interface PainPointStepProps {
  onNext: (painPoint: string) => void;
  onBack: () => void;
}

const PAIN_POINTS = [
  {
    id: "decision-time",
    text: "Takes too long to decide",
    icon: Clock
  },
  {
    id: "forget-items",
    text: "I forget what's in my closet",
    icon: Brain
  },
  {
    id: "unsure-looks",
    text: "Not sure if outfits look good",
    icon: HelpCircle
  },
  {
    id: "unworn-purchases",
    text: "I buy clothes I never wear",
    icon: ShoppingBag
  }
];

export const PainPointStep = ({ onNext, onBack }: PainPointStepProps) => {
  const [selectedPainPoint, setSelectedPainPoint] = useState<string | null>(null);

  const handleSelection = (painPointId: string) => {
    setSelectedPainPoint(painPointId);
    
    // Auto-advance after selection with delay
    setTimeout(() => {
      const selectedPainPointData = PAIN_POINTS.find(p => p.id === painPointId);
      onNext(selectedPainPointData?.text || painPointId);
    }, 300);
  };

  return (
    <OnboardingLayout
      currentStep={3}
      totalSteps={10}
      showBackButton={true}
      onBack={onBack}
    >
      <div className="flex-1 flex flex-col px-6 py-12 safe-area-inset">
        <div className="mb-16">
          <h1 className="text-3xl font-bold text-black leading-tight" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 700 }}>
            What frustrates you most?
          </h1>
        </div>

        <div className="space-y-5">
          {PAIN_POINTS.map((painPoint, index) => {
            const IconComponent = painPoint.icon;
            return (
              <motion.button
                key={painPoint.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                onClick={() => handleSelection(painPoint.id)}
                className={`w-full flex items-center gap-5 p-6 rounded-2xl border transition-all duration-150 ${
                  selectedPainPoint === painPoint.id 
                    ? 'border-2 border-black bg-white shadow-sm' 
                    : 'border border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <IconComponent 
                  size={28} 
                  className={selectedPainPoint === painPoint.id ? 'text-black' : 'text-gray-500'} 
                  strokeWidth={2}
                />
                <span 
                  className="text-base text-left flex-1 text-black"
                  style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 500 }}
                >
                  {painPoint.text}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </OnboardingLayout>
  );
};
