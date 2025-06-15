
export interface OnboardingData {
  age?: string;
  mainGoal?: string;
  analysisResult?: StyleAnalysisResult;
  requiresAuth?: boolean;
}

export interface StyleAnalysisResult {
  overallScore: number;
  rawAnalysis: string;
  imageUrl?: string;
  summary: string;
  breakdown: Array<{
    category: string;
    score: number;
    emoji: string;
  }>;
  tips: string[];
}

export type OnboardingStep = 
  | 'welcome' 
  | 'age' 
  | 'goal' 
  | 'test-photo' 
  | 'rating' 
  | 'celebration' 
  | 'trial-offer' 
  | 'paywall';
