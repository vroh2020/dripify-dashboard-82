
import DOMPurify from 'dompurify';

// Rate limiting utilities
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export const checkRateLimit = (key: string, maxRequests: number, windowMs: number): boolean => {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (entry.count >= maxRequests) {
    return false;
  }
  
  entry.count++;
  return true;
};

// Clean up expired rate limit entries
export const cleanupRateLimits = () => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
};

// Secure random generation
export const generateSecureRandom = (length: number = 16): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// File validation
export const validateFileUpload = (file: File): { isValid: boolean; error?: string } => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' };
  }
  
  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { isValid: false, error: 'File too large. Maximum size is 10MB.' };
  }
  
  // Check for malicious patterns in filename
  const filename = file.name.toLowerCase();
  const maliciousPatterns = ['.exe', '.bat', '.cmd', '.scr', '.php', '.js', '.html'];
  if (maliciousPatterns.some(pattern => filename.includes(pattern))) {
    return { isValid: false, error: 'Invalid file name.' };
  }
  
  return { isValid: true };
};

// Input sanitization
export const sanitizeInput = (input: string, maxLength: number = 1000): string => {
  return DOMPurify.sanitize(input.slice(0, maxLength), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};

// Password validation
export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long.' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter.' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter.' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number.' };
  }
  
  return { isValid: true };
};

// Security event logging
export const logSecurityEvent = (event: string, details: Record<string, any>) => {
  console.warn(`[SECURITY] ${event}:`, {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    ...details
  });
};

// Clean up rate limits periodically (run every 5 minutes)
setInterval(cleanupRateLimits, 5 * 60 * 1000);
