
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.genstyle.app',
  appName: 'GenStyle',
  webDir: 'dist',
  plugins: {
    PurchasesPlugin: {
      // RevenueCat specific configuration
      // API key is now stored in environment variables for security
      // iOS API key should be set through CI/CD environment variables
      // For local testing, add your RevenueCat API key here temporarily
      apiKey: {
        // Use sandbox API key for development
        ios: 'YOUR_REVENUECAT_IOS_API_KEY',
        android: 'YOUR_REVENUECAT_ANDROID_API_KEY'
      },
      automaticAppleSearchAdsAttributionCollection: true,
      observerMode: false
    }
  }
};

export default config;
