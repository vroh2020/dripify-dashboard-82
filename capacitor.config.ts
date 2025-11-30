import { CapacitorConfig } from '@capacitor/cli';

type TrendzaCapacitorConfig = CapacitorConfig & {
  packageClassList?: string[];
};

const config: TrendzaCapacitorConfig = {
  appId: 'com.genstyle.app', // This matches your bundle ID
  appName: 'OutfitGrader AI',
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
      // Apple Sign In plugin configuration - native iOS
      clientId: 'service.com.genstyle.app',
      scopes: 'email name'
    },
    BackgroundRemoval: {}
  },
  packageClassList: [
    'SignInWithApple',
    'InAppReviewPlugin',
    'AppPlugin',
    'CAPBrowserPlugin',
    'CAPCameraPlugin',
    'PreferencesPlugin',
    'SplashScreenPlugin',
    'PurchasesPlugin',
    'BackgroundRemovalPlugin'
  ]
};

export default config;
