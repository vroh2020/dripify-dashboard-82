
export interface OnboardingData {
  age?: string;
  mainGoal?: string;
  analysisResult?: StyleAnalysisResult;
  requiresAuth?: boolean;
}

// Import the main StyleAnalysisResult type instead of defining our own
export type { StyleAnalysisResult } from '@/types/styleTypes';

export type OnboardingStep = 
  | 'welcome' 
  | 'age' 
  | 'goal' 
  | 'test-photo' 
  | 'rating' 
  | 'celebration' 
  | 'trial-offer' 
  | 'paywall';
