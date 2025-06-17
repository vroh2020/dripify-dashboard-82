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
      launchShowDuration: 0,        // Video recommendation: 0 for manual control
      launchAutoHide: false,        // Video recommendation: false for manual control
      backgroundColor: "#1A1F2C",   // Match your brand dark color
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,           // Video recommendation: false (we have custom animation)
      splashFullScreen: false,      // Video recommendation: false for better compatibility
      splashImmersive: false,       // Video recommendation: false for better compatibility
      launchFadeOutDuration: 300,   // Smooth fade out
    },
    PurchasesPlugin: {
      // RevenueCat configuration for your monthly subscription
      apiKey: "appl_xeXwsXdzeTPLDObsCBanrDrxUWV", // Your iOS API key
      useAmazonSandbox: false,
      shouldShowInAppMessagesAutomatically: true
    }
  }
};

export default config;
