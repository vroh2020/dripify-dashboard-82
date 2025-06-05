
import { z } from 'zod';

// File upload validation
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: 'File size must be less than 10MB' };
  }
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { isValid: false, error: 'Only JPEG, PNG, and WebP images are allowed' };
  }
  
  return { isValid: true };
};

// User input schemas
export const userProfileSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  
  gender: z.string().optional(),
  bodyType: z.string().optional(),
  stylePreference: z.string().optional(),
  budgetRange: z.string().optional(),
  
  colorPreferences: z.array(z.string()).optional(),
  stylePreferences: z.array(z.string()).optional(),
  favoriteBrands: z.array(z.string()).optional(),
});

export const styleAnalysisSchema = z.object({
  totalScore: z.number().min(0).max(100),
  feedback: z.string().min(1, 'Feedback is required'),
  breakdown: z.array(z.object({
    category: z.string(),
    score: z.number().min(0).max(100),
    emoji: z.string().optional()
  })),
  tips: z.array(z.object({
    category: z.string(),
    tip: z.string(),
    level: z.enum(['beginner', 'intermediate', 'advanced'])
  })).optional(),
});

// Sanitize HTML content to prevent XSS
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Rate limiting helper (basic client-side protection)
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(private maxRequests: number, private timeWindow: number) {}
  
  canMakeRequest(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Remove old requests outside time window
    const validRequests = userRequests.filter(time => now - time < this.timeWindow);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }
}

// Create rate limiter instances
export const analysisRateLimiter = new RateLimiter(5, 60000); // 5 requests per minute
export const uploadRateLimiter = new RateLimiter(10, 60000); // 10 uploads per minute
