
import DOMPurify from 'dompurify';

export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p'],
    ALLOWED_ATTR: []
  });
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const validateUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  const reservedWords = ['admin', 'root', 'system', 'api', 'www', 'support'];
  return usernameRegex.test(username) && !reservedWords.includes(username.toLowerCase());
};

export const validateUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    // Block private networks and localhost for security
    const hostname = urlObj.hostname.toLowerCase();
    const privateNetworks = ['localhost', '127.0.0.1', '0.0.0.0', '10.', '172.', '192.168.'];
    return !privateNetworks.some(network => hostname.includes(network));
  } catch {
    return false;
  }
};

export const sanitizeText = (text: string, maxLength: number = 1000): string => {
  return text.slice(0, maxLength).replace(/[<>]/g, '');
};
