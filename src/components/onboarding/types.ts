
export interface OnboardingData {
  age?: string;
  referralSource?: string;
  mainGoal?: string;
  analysisResult?: StyleAnalysisResult;
}

export interface StyleAnalysisResult {
  overallScore: number;
  rawAnalysis: string;
  imageUrl: string;
  summary?: string;
  breakdown?: Array<{
    category: string;
    score: number;
    emoji: string;
  }>;
  tips?: Array<{
    category: string;
    tip: string;
  }>;
}

export type OnboardingStep = 
  | 'welcome' 
  | 'age' 
  | 'goal' 
  | 'test-photo' 
  | 'rating' 
  | 'celebration' 
  | 'trial-offer' 
  | 'trial-reminder'
  | 'pricing'
  | 'paywall';

export interface StepProps {
  onNext: () => void;
  onComplete?: () => void;
  onboardingData?: OnboardingData;
  setOnboardingData?: (data: OnboardingData) => void;
}
