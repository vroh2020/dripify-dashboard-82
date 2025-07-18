import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OnboardingOptionProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  selected?: boolean;
  onClick: () => void;
  className?: string;
}

export const OnboardingOption: React.FC<OnboardingOptionProps> = ({
  icon,
  title,
  description,
  selected = false,
  onClick,
  className
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-xl border transition-all duration-200",
        "flex items-center gap-3 text-left",
        selected 
          ? "bg-gradient-to-r from-orange-500/20 to-orange-400/20 text-white border-orange-500/50 shadow-lg scale-105" 
          : "bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-white/20",
        className
      )}
    >
      {icon && <span className="text-2xl">{icon}</span>}
      <div className="flex-1">
        <span className="font-medium">{title}</span>
        {description && (
          <div className="text-sm opacity-80 mt-1">{description}</div>
        )}
      </div>
    </button>
  );
};