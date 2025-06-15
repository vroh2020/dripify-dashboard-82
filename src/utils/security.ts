
// Security utilities for input validation and sanitization
import DOMPurify from 'dompurify';

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; timestamp: number; blocked: boolean }>();

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized?: any;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

/**
 * Secure random string generation using crypto.getRandomValues
 */
export const generateSecureRandom = (length: number = 16): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += charset[values[i] % charset.length];
    }
  } else {
    // Fallback for development
    for (let i = 0; i < length; i++) {
      result += charset[Math.floor(Math.random() * charset.length)];
    }
  }
  
  return result;
};

/**
 * Rate limiting implementation
 */
export const checkRateLimit = (
  key: string, 
  config: RateLimitConfig
): { allowed: boolean; retryAfter?: number } => {
  const now = Date.now();
  const limit = rateLimitMap.get(key);
  
  // Check if currently blocked
  if (limit?.blocked && limit.timestamp + (config.blockDurationMs || config.windowMs) > now) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((limit.timestamp + (config.blockDurationMs || config.windowMs) - now) / 1000)
    };
  }
  
  // Reset window if expired
  if (!limit || now - limit.timestamp > config.windowMs) {
    rateLimitMap.set(key, { count: 1, timestamp: now, blocked: false });
    return { allowed: true };
  }
  
  // Increment count
  limit.count++;
  
  // Check if limit exceeded
  if (limit.count > config.maxRequests) {
    limit.blocked = true;
    limit.timestamp = now;
    return { 
      allowed: false, 
      retryAfter: Math.ceil((config.blockDurationMs || config.windowMs) / 1000)
    };
  }
  
  return { allowed: true };
};

/**
 * Text input sanitization
 */
export const sanitizeTextInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  // Remove any HTML tags and sanitize
  const cleaned = DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
  
  // Trim whitespace and limit length
  return cleaned.trim().substring(0, 1000);
};

/**
 * File upload validation
 */
export const validateFileUpload = (file: File): ValidationResult => {
  const errors: string[] = [];
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.type)) {
    errors.push('Only JPEG, PNG, WebP, and HEIC images are allowed');
  }

  if (file.size > maxSize) {
    errors.push('File must be smaller than 10MB');
  }

  if (file.size === 0) {
    errors.push('File is empty');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: file
  };
};

/**
 * Email validation
 */
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
    return { isValid: false, errors };
  }
  
  // Basic email format validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    errors.push('Invalid email format');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: sanitizeTextInput(email.toLowerCase())
  };
};

/**
 * Sanitize user metadata before storing
 */
export const sanitizeUserMetadata = (metadata: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    // Only allow safe keys
    const allowedKeys = [
      'username', 'age_range', 'main_goal', 'style_preference',
      'is_temp_account', 'created_via', 'onboarding_completed'
    ];
    
    if (!allowedKeys.includes(key)) {
      continue;
    }
    
    // Sanitize string values
    if (typeof value === 'string') {
      sanitized[key] = sanitizeTextInput(value);
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Clear expired rate limit entries (call periodically)
 */
export const cleanupRateLimits = (): void => {
  const now = Date.now();
  const CLEANUP_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [key, limit] of rateLimitMap.entries()) {
    if (now - limit.timestamp > CLEANUP_THRESHOLD) {
      rateLimitMap.delete(key);
    }
  }
};
