import type { StyleAnalysisResult } from '@/types/styleTypes';

// Re-export the type for other files to use
export type { StyleAnalysisResult } from '@/types/styleTypes';

export type OnboardingStepId =
  | 'welcome'
  | 'heard-about'
  | 'age-range'
  | 'gender'
  | 'style-goal'
  | 'category'
  | 'budget'
  | 'brands'
  | 'color-vibe'
  | 'occasions'
  | 'selfie'
  | 'weekly-reports'
  | 'instant-suggestions'
  | 'palette'
  | 'shop-frequency'
  | 'final-confirm'
  | 'account-choice'
  | 'paywall';

export interface OnboardingAnswers {
  [key: string]: string | File | boolean | null;
  selfie?: File | null;
  account_choice?: string;
  premium?: boolean;
}
