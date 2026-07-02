import { CapacitorConfig } from '@capacitor/cli';

type TrendzaCapacitorConfig = CapacitorConfig & {
  packageClassList?: string[];
};

const config: TrendzaCapacitorConfig = {
  appId: 'com.genstyle.app',
  appName: 'trendza',
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
    // WebView-level scroll. Previously `true` because the BG-removal
    // WASM module streamed in via a long-lived scroll-y container. We
    // now stream the model inside a single full-screen overlay mounted
    // at z-[120] (visuals launched separately), so the WebView no
    // longer needs global scroll. Locking it here matches Tier 1's body
    // `position: fixed` + `overscroll-behavior-y: none` so the native
    // shell feels like one piece of glass instead of a webpage.
    scrollEnabled: false
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
    'PurchasesPlugin',
    'BackgroundRemovalPlugin'
  ]
};

export default config;