
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.genstyle.app', // This matches your bundle ID
  appName: 'DripMax',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,        // We control timing manually
      launchAutoHide: false,        // We hide it manually in code
      backgroundColor: "#1A1F2C",   // Match your brand color
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,           // We have custom loading animation
      splashFullScreen: true,
      splashImmersive: true,
      launchFadeOutDuration: 500,   // Smooth fade out
    },
    PurchasesPlugin: {
      // RevenueCat Capacitor plugin configuration
      apiKey: "", // Will be set dynamically from Supabase
      useAmazonSandbox: false,
      shouldShowInAppMessagesAutomatically: true
    }
  }
};

export default config;
