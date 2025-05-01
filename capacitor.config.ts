import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.genstyle.app',
  appName: 'GenStyle',
  webDir: 'dist',
  plugins: {
    PurchasesPlugin: {
      // RevenueCat specific configuration
      automaticAppleSearchAdsAttributionCollection: true,
      observerMode: false
    }
  }
};

export default config;
