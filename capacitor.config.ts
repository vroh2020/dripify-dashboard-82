import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.genstyle.app', // This matches your bundle ID
  appName: 'DripMax',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  ios: {
    // Fix for scene configuration warning in Capacitor apps
    scheme: 'App',
    // Disable scene delegate completely for Capacitor
    contentInset: 'automatic',
    // Use traditional AppDelegate approach
    preferredContentMode: 'mobile'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,        // Video recommendation: 0 for manual control
      launchAutoHide: false,        // Video recommendation: false for manual control
      backgroundColor: "#1A1F2C",   // Match your brand dark color
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,           // Video recommendation: false (we have custom animation)
      splashFullScreen: false,      // Video recommendation: false for better compatibility
      splashImmersive: false,       // Video recommendation: false for better compatibility
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
