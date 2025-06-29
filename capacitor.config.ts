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
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PurchasesPlugin: {
      // RevenueCat Capacitor plugin configuration
      apiKey: "", // Will be set dynamically from Supabase
      useAmazonSandbox: false,
      shouldShowInAppMessagesAutomatically: true
    },
    SignInWithApple: {
      // Apple Sign In plugin configuration - web OAuth
      clientId: 'service.com.genstyle.app',
      redirectURI: 'https://ijqwhxamjxsiotnhhqco.supabase.co/auth/v1/callback',
      scopes: 'email name'
    }
  }
};

export default config;
