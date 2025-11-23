import { useState } from "react";
import { motion } from "framer-motion";
import { OnboardingLayout } from "../OnboardingLayout";
import { CalendarClock, Calendar, CalendarDays, X } from "lucide-react";

interface ShoppingFrequencyNewStepProps {
  onNext: (frequency: string) => void;
  onBack: () => void;
}

const SHOPPING_FREQUENCIES = [
  {
    id: "monthly",
    text: "Monthly or more",
    icon: CalendarClock
  },
  {
    id: "few-months",
    text: "Every few months",
    icon: Calendar
  },
  {
    id: "rarely",
    text: "Rarely, only when needed",
    icon: CalendarDays
  },
  {
    id: "trying-to-stop",
    text: "Trying to stop buying",
    icon: X
  }
];

export const ShoppingFrequencyNewStep = ({ onNext, onBack }: ShoppingFrequencyNewStepProps) => {
  const [selectedFrequency, setSelectedFrequency] = useState<string | null>(null);

  const handleSelection = (frequencyId: string) => {
    setSelectedFrequency(frequencyId);
    
    // Auto-advance after selection with delay
    setTimeout(() => {
      const selectedFrequencyData = SHOPPING_FREQUENCIES.find(f => f.id === frequencyId);
      onNext(selectedFrequencyData?.text || frequencyId);
    }, 300);
  };

  return (
    <OnboardingLayout
      currentStep={5}
      totalSteps={10}
      showBackButton={true}
      onBack={onBack}
    >
      <div className="flex-1 flex flex-col px-6 py-12 safe-area-inset">
        <div className="mb-16">
          <h1 className="text-3xl font-bold text-black leading-tight" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 700 }}>
            How often do you buy clothes?
          </h1>
        </div>

        <div className="space-y-5">
          {SHOPPING_FREQUENCIES.map((frequency, index) => {
            const IconComponent = frequency.icon;
            return (
              <motion.button
                key={frequency.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                onClick={() => handleSelection(frequency.id)}
                className={`w-full flex items-center gap-5 p-6 rounded-2xl border transition-all duration-150 ${
                  selectedFrequency === frequency.id 
                    ? 'border-2 border-black bg-white shadow-sm' 
                    : 'border border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <IconComponent 
                  size={28} 
                  className={selectedFrequency === frequency.id ? 'text-black' : 'text-gray-500'} 
                  strokeWidth={2}
                />
                <span 
                  className="text-base text-left flex-1 text-black"
                  style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 500 }}
                >
                  {frequency.text}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </OnboardingLayout>
  );
};
