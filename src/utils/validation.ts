
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
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Only JPEG, PNG, WebP, and HEIC images are allowed' };
  }

  if (file.size > maxSize) {
    return { isValid: false, error: 'Image must be smaller than 10MB' };
  }

  return { isValid: true };
};

// Rate limiter for analysis requests
const analysisRequests = new Map<string, { count: number; timestamp: number }>();

export const analysisRateLimiter = (userId: string): { allowed: boolean; retryAfter?: number } => {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 5; // 5 requests per minute

  const userRequests = analysisRequests.get(userId);
  
  if (!userRequests || now - userRequests.timestamp > windowMs) {
    analysisRequests.set(userId, { count: 1, timestamp: now });
    return { allowed: true };
  }

  if (userRequests.count >= maxRequests) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((windowMs - (now - userRequests.timestamp)) / 1000)
    };
  }

  userRequests.count++;
  return { allowed: true };
};

// HTML sanitization
export const sanitizeHtml = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
};
