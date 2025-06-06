
// RevenueCat configuration with secure server-side key fetching
export const REVENUECAT_CONFIG = {
  // API key will be fetched securely from server-side
  apiKey: '', // Removed hardcoded key for security
  
  // Use server-side endpoint to get API key securely
  async getApiKey(): Promise<string> {
    try {
      const response = await fetch('/api/revenuecat-config');
      const data = await response.json();
      return data.apiKey || '';
    } catch (error) {
      console.error('Failed to fetch RevenueCat API key:', error);
      return '';
    }
  }
};
