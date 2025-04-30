
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.genstyle.app',
  appName: 'Gen Style',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Uncomment this when running in development to enable live reload
    // url: 'http://your-development-server:port',
    // cleartext: true
  },
  plugins: {
    PurchasesPlugin: {
      automaticAppleSearchAdsAttributionCollection: true,
      observerMode: false
    }
  }
};

export default config;
