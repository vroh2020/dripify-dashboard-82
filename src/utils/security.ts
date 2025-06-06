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
    // Fallback - should only be used in development
    console.warn('crypto.getRandomValues not available, using fallback random generation');
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
 * File upload validation
 */
export const validateFileUpload = (file: File): ValidationResult => {
  const errors: string[] = [];
  
  // Check file size (10MB limit)
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    errors.push('File size must be less than 10MB');
  }
  
  // Check file type - only allow specific image types
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('Only JPEG, PNG, and WebP images are allowed');
  }
  
  // Check file name for suspicious patterns
  const suspiciousPatterns = [
    /\.(php|js|html|css|asp|jsp)$/i,
    /\.\./,
    /[<>:"|?*]/,
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(file.name)) {
      errors.push('Invalid file name');
      break;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
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
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /data:/i,
    /vbscript:/i
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(email)) {
      errors.push('Invalid email format');
      break;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: sanitizeTextInput(email.toLowerCase())
  };
};

/**
 * Username validation
 */
export const validateUsername = (username: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!username || typeof username !== 'string') {
    errors.push('Username is required');
    return { isValid: false, errors };
  }
  
  // Length validation
  if (username.length < 3 || username.length > 30) {
    errors.push('Username must be between 3 and 30 characters');
  }
  
  // Character validation - only alphanumeric and underscore
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }
  
  // Check for reserved words
  const reservedWords = [
    'admin', 'administrator', 'root', 'system', 'null', 'undefined',
    'api', 'www', 'ftp', 'mail', 'email', 'support', 'help'
  ];
  
  if (reservedWords.includes(username.toLowerCase())) {
    errors.push('Username is not available');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: sanitizeTextInput(username)
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
 * URL validation for user-provided URLs
 */
export const validateUrl = (url: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!url || typeof url !== 'string') {
    errors.push('URL is required');
    return { isValid: false, errors };
  }
  
  try {
    const urlObj = new URL(url);
    
    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      errors.push('Only HTTP and HTTPS URLs are allowed');
    }
    
    // Block localhost and private IPs in production
    if (import.meta.env.PROD) {
      const hostname = urlObj.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname.startsWith('127.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
      ) {
        errors.push('Private network URLs are not allowed');
      }
    }
  } catch {
    errors.push('Invalid URL format');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: url.trim()
  };
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