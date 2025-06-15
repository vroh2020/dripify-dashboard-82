
// Import the main StyleAnalysisResult type first
export type { StyleAnalysisResult } from '@/types/styleTypes';

export interface OnboardingData {
  age?: string;
  mainGoal?: string;
  analysisResult?: StyleAnalysisResult;
  requiresAuth?: boolean;
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
