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
      launchShowDuration: 0,        // Manual control for smooth transitions
      launchAutoHide: false,        // Manual control for better timing
      backgroundColor: "#1A1F2C",   // Match your brand dark color
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,           // Custom animation instead
      splashFullScreen: true,       // Full screen immersive experience
      splashImmersive: true,        // Immersive mode for better UX
      launchFadeOutDuration: 500,   // Smooth 500ms fade out
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
