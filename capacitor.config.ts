
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dripmax.app',
  appName: 'Drip Max',
  webDir: 'dist',
  ios: {
    scheme: 'App',
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#1A1F2C',
    limitsNavigationsToAppBoundDomains: true,
    preferredContentMode: 'mobile',
    allowsLinkPreview: true
  },
  server: {
    androidScheme: 'https',
    // Uncomment this when running in development to enable live reload
    // url: 'http://your-development-server:port',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0, // Don't auto-hide, we control it manually
      launchAutoHide: false, // We control hiding manually
      backgroundColor: "#1A1F2C", // Match your brand color
      androidSplashResourceName: "splash", // Android splash resource name
      iosSplashResourceName: "Splash", // iOS splash resource name (changed from Default)
      showSpinner: false, // No spinner, we have custom loading
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#f97316",
      splashFullScreen: true, // Full screen splash
      splashImmersive: true, // Hide status bar on Android
      launchFadeOutDuration: 500 // Smooth fade out (increased)
    },
    // Performance optimizations
    Keyboard: {
      resize: "body",
      style: "dark",
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#1A1F2C",
    },
    PurchasesPlugin: {
      automaticAppleSearchAdsAttributionCollection: true,
      observerMode: false
    }
  }
};

export default config;
