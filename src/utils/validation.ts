
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

// HTML sanitization
export const sanitizeHtml = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
};
