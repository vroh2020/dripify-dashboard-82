import { InAppReview } from '@capacitor-community/in-app-review';
import { Preferences } from '@capacitor/preferences';

const REVIEW_COUNT_KEY = 'review_prompt_count';
const LAST_REVIEW_PROMPT_KEY = 'last_review_prompt';

export class ReviewService {
  private static instance: ReviewService;
  private readonly MIN_SCANS_BEFORE_REVIEW = 1;
  private readonly DAYS_BETWEEN_PROMPTS = 7;

  private constructor() {}

  public static getInstance(): ReviewService {
    if (!ReviewService.instance) {
      ReviewService.instance = new ReviewService();
    }
    return ReviewService.instance;
  }

  public async shouldPromptForReview(scanCount: number): Promise<boolean> {
    // Check if we've shown the review prompt recently
    const { value: lastPrompt } = await Preferences.get({ key: LAST_REVIEW_PROMPT_KEY });
    if (lastPrompt) {
      const lastPromptDate = new Date(lastPrompt);
      const daysSinceLastPrompt = (Date.now() - lastPromptDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastPrompt < this.DAYS_BETWEEN_PROMPTS) {
        return false;
      }
    }

    // Check if user has done enough scans
    const { value: reviewCount } = await Preferences.get({ key: REVIEW_COUNT_KEY });
    const count = reviewCount ? parseInt(reviewCount) : 0;
    
    return scanCount >= this.MIN_SCANS_BEFORE_REVIEW && count < 3;
  }

  public async promptForReview(): Promise<void> {
    try {
      await InAppReview.requestReview();
      
      // Update the last prompt time
      await Preferences.set({
        key: LAST_REVIEW_PROMPT_KEY,
        value: new Date().toISOString()
      });

      // Increment the review count
      const { value: reviewCount } = await Preferences.get({ key: REVIEW_COUNT_KEY });
      const count = reviewCount ? parseInt(reviewCount) : 0;
      await Preferences.set({
        key: REVIEW_COUNT_KEY,
        value: (count + 1).toString()
      });
    } catch (error) {
      console.warn('Failed to show review prompt:', error);
    }
  }
}

export const reviewService = ReviewService.getInstance(); 