import { CapacitorConfig } from '@capacitor/cli';

type TrendzaCapacitorConfig = CapacitorConfig & {
  packageClassList?: string[];
};

const config: TrendzaCapacitorConfig = {
  appId: 'com.genstyle.app',
  appName: 'OutfitGrader AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  // CRITICAL: iOS WebView configuration for WASM/Background Removal
  ios: {
    contentInset: 'never',
    // Allow external CDN access for HuggingFace model downloads
    limitsNavigationsToAppBoundDomains: false,
    // Disable link previews to improve performance
    allowsLinkPreview: false,
    // Enable scrolling (important for WASM file loading)
    scrollEnabled: true
  },
  plugins: {
    Camera: {
      photoAlbum: true,
      allowEditing: false,
      resultType: "base64",
      presentationStyle: "fullscreen",
      gallery: {
        source: "photoLibrary",
        presentationStyle: "popover",
        limit: 0 // 🔥 unlimited multi-select
      }
    },
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
      apiKey: "",
      useAmazonSandbox: false,
      shouldShowInAppMessagesAutomatically: true
    },
    SignInWithApple: {
      clientId: 'service.com.genstyle.app',
      scopes: 'email name'
    }
  },
  packageClassList: [
    'SignInWithApple',
    'InAppReviewPlugin',
    'AppPlugin',
    'CAPBrowserPlugin',
    'CAPCameraPlugin',
    'PreferencesPlugin',
    'SplashScreenPlugin',
    'PurchasesPlugin'
  ]
};

export default config;