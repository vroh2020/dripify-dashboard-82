
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.genstyle.app',
  appName: 'Gen Style',
  webDir: 'dist',
  plugins: {
    PurchasesPlugin: {
      automaticAppleSearchAdsAttributionCollection: true,
      observerMode: false
    }
  }
};

export default config;
