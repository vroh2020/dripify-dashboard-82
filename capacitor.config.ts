import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dripmax.app',
  appName: 'Drip Max',
  webDir: 'dist',
  ios: {
    scheme: 'App',
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#ffffff',
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
      launchShowDuration: 0, // Hide immediately to show our custom splash
      launchAutoHide: false, // We'll control hiding manually
      backgroundColor: "#1A1F2C",
      androidSplashResourceName: "splash",
      iosSplashResourceName: "Default",
      showSpinner: false, // We have our own loading animation
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#f97316"
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
