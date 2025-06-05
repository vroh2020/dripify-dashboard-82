
import DOMPurify from 'dompurify';
import { SECURITY_CONFIG } from '@/config/security';

// Email validation
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  if (email.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }
  
  return { isValid: true };
};

// Username validation
export const validateUsername = (username: string): { isValid: boolean; error?: string } => {
  if (!username) {
    return { isValid: false, error: 'Username is required' };
  }
  
  if (username.length < SECURITY_CONFIG.MIN_USERNAME_LENGTH) {
    return { isValid: false, error: `Username must be at least ${SECURITY_CONFIG.MIN_USERNAME_LENGTH} characters` };
  }
  
  if (username.length > SECURITY_CONFIG.MAX_USERNAME_LENGTH) {
    return { isValid: false, error: `Username must be no more than ${SECURITY_CONFIG.MAX_USERNAME_LENGTH} characters` };
  }
  
  if (!SECURITY_CONFIG.ALLOWED_USERNAME_PATTERN.test(username)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, hyphens, and underscores' };
  }
  
  const reservedWords = ['admin', 'api', 'www', 'mail', 'ftp', 'localhost', 'root'];
  if (reservedWords.includes(username.toLowerCase())) {
    return { isValid: false, error: 'This username is reserved' };
  }
  
  return { isValid: true };
};

// Image file validation
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }
  
  // Check file size
  if (file.size > SECURITY_CONFIG.MAX_FILE_SIZE) {
    const maxSizeMB = SECURITY_CONFIG.MAX_FILE_SIZE / (1024 * 1024);
    return { isValid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }
  
  // Check file type
  if (!SECURITY_CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { isValid: false, error: 'Only JPEG, PNG, and WebP images are allowed' };
  }
  
  // Basic security check for malicious filenames
  const dangerousPatterns = [
    /\.php$/i, /\.jsp$/i, /\.asp$/i, /\.exe$/i, /\.bat$/i, /\.sh$/i,
    /\.py$/i, /\.rb$/i, /\.pl$/i, /\.js$/i, /\.html$/i, /\.htm$/i
  ];
  
  if (dangerousPatterns.some(pattern => pattern.test(file.name))) {
    return { isValid: false, error: 'File type not allowed for security reasons' };
  }
  
  return { isValid: true };
};

// HTML sanitization
export const sanitizeHtml = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
};

// Rate limiting utility
interface RateLimit {
  count: number;
  lastReset: number;
}

class RateLimiter {
  private limits: Map<string, RateLimit> = new Map();
  
  constructor(private maxRequests: number, private timeWindow: number) {}
  
  canMakeRequest(key: string): boolean {
    const now = Date.now();
    const limit = this.limits.get(key);
    
    if (!limit || now - limit.lastReset > this.timeWindow) {
      this.limits.set(key, { count: 1, lastReset: now });
      return true;
    }
    
    if (limit.count >= this.maxRequests) {
      return false;
    }
    
    limit.count++;
    return true;
  }
  
  cleanup(): void {
    const now = Date.now();
    for (const [key, limit] of this.limits.entries()) {
      if (now - limit.lastReset > this.timeWindow) {
        this.limits.delete(key);
      }
    }
  }
}

// Rate limiters for different operations
export const analysisRateLimiter = new RateLimiter(
  SECURITY_CONFIG.ANALYSIS_RATE_LIMIT.maxRequests,
  SECURITY_CONFIG.ANALYSIS_RATE_LIMIT.timeWindow
);

export const uploadRateLimiter = new RateLimiter(
  SECURITY_CONFIG.UPLOAD_RATE_LIMIT.maxRequests,
  SECURITY_CONFIG.UPLOAD_RATE_LIMIT.timeWindow
);

// Cleanup rate limiters periodically
setInterval(() => {
  analysisRateLimiter.cleanup();
  uploadRateLimiter.cleanup();
}, 60000); // Clean up every minute
