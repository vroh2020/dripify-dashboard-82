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
    <Button
      variant={selected ? "default" : "outline"}
      className={cn(
        "w-full h-auto p-4 flex items-center justify-start text-left transition-all duration-200",
        "hover:bg-accent hover:text-accent-foreground",
        selected && "bg-primary text-primary-foreground",
        className
      )}
      onClick={onClick}
    >
      {icon && (
        <div className="mr-3 text-xl flex-shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1">
        <div className="font-medium">{title}</div>
        {description && (
          <div className="text-sm opacity-80 mt-1">{description}</div>
        )}
      </div>
    </Button>
  );
};