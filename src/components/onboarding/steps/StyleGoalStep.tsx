import { useState } from "react";
import { motion } from "framer-motion";
import { OnboardingLayout } from "../OnboardingLayout";
import { Briefcase, RefreshCw, Shuffle, Star } from "lucide-react";

interface StyleGoalStepProps {
  onNext: (goal: string) => void;
  onBack: () => void;
}

const STYLE_GOALS = [
  {
    id: "put-together",
    text: "Look more put together daily",
    icon: Briefcase
  },
  {
    id: "maximize-wardrobe",
    text: "Make the most of what I own",
    icon: RefreshCw
  },
  {
    id: "variety",
    text: "Stop repeating outfits",
    icon: Shuffle
  },
  {
    id: "confidence",
    text: "Get confident in my style",
    icon: Star
  }
];

export const StyleGoalStep = ({ onNext, onBack }: StyleGoalStepProps) => {
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const handleSelection = (goalId: string) => {
    setSelectedGoal(goalId);
    
    // Auto-advance after selection with delay
    setTimeout(() => {
      const selectedGoalData = STYLE_GOALS.find(g => g.id === goalId);
      onNext(selectedGoalData?.text || goalId);
    }, 300);
  };

  return (
    <OnboardingLayout
      currentStep={2}
      totalSteps={10}
      showBackButton={true}
      onBack={onBack}
    >
      <div className="flex-1 flex flex-col px-6 py-12 safe-area-inset">
        <div className="mb-16">
          <h1 className="text-3xl font-bold text-black leading-tight" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 700 }}>
            What's your main style goal?
          </h1>
        </div>

        <div className="space-y-5">
          {STYLE_GOALS.map((goal, index) => {
            const IconComponent = goal.icon;
            return (
              <motion.button
                key={goal.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                onClick={() => handleSelection(goal.id)}
                className={`w-full flex items-center gap-5 p-6 rounded-2xl border transition-all duration-150 ${
                  selectedGoal === goal.id 
                    ? 'border-2 border-black bg-white shadow-sm' 
                    : 'border border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <IconComponent 
                  size={28} 
                  className={selectedGoal === goal.id ? 'text-black' : 'text-gray-500'} 
                  strokeWidth={2}
                />
                <span 
                  className="text-base text-left flex-1 text-black"
                  style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', fontWeight: 500 }}
                >
                  {goal.text}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </OnboardingLayout>
  );
};
