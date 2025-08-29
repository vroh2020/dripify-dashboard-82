### Branding references

```1:35:dripify-dashboard-82/capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
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
    }
  }
};

export default config;
```

```1:64:dripify-dashboard-82/ios/App/App/Info.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleDisplayName</key>
	<string>OutfitGrader AI</string>
  <!-- ... -->
```

```94:138:dripify-dashboard-82/ios/App/App.xcodeproj/project.pbxproj
name = App;
productName = App;
productReference = 504EC3041FED79650016851F /* App.app */;
productType = "com.apple.product-type.application";
buildSettings = {
  ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
  // ...
  PRODUCT_BUNDLE_IDENTIFIER = com.genstyle.app;
  PRODUCT_NAME = "$(TARGET_NAME)";
  PROVISIONING_PROFILE = "Dripify AI";
  PROVISIONING_PROFILE_SPECIFIER = "Dripify AI";
};
```

### Paywall and RevenueCat references

```13:52:dripify-dashboard-82/src/services/paymentService.ts
// Initialize RevenueCat
async initializeRevenueCat(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log('Web platform - skipping RevenueCat initialization');
    return true;
  }
  try {
    const { data: config, error: configError } = await supabase.functions.invoke('revenuecat-config');
    if (configError || !config.publicKey) {
      console.error('Failed to fetch RevenueCat API key:', configError);
      return false;
    }
    await Purchases.configure({ apiKey: config.publicKey, appUserID: null });
    return true;
  } catch (error) {
    return false;
  }
}
```

```23:66:dripify-dashboard-82/src/services/revenueCatService.ts
export const configureRevenueCat = async 
  if (isConfigured || !Capacitor.isNativePlatform()) {
    return;
  }
  // Fetch the API key from Supabase Edge Function
  const { data: config } = await supabase.functions.invoke('revenuecat-config');
  // Configure RevenueCat
  await Purchases.configure({ apiKey: config.publicKey, appUserID: null });
```

```16:56:dripify-dashboard-82/src/hooks/useRevenueCatManager.ts
useEffect(() => {
  if (!user) {
    setSubscription({ isActive: false, expirationDate: null, productId: null, offeringId: null });
    return;
  }
  // Web platform initialization
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, subscription_expires_at')
    .eq('id', user.id)
    .maybeSingle();
  // Native path uses revenuecat-config
}, []);
```

```2:48:dripify-dashboard-82/supabase/functions/revenuecat-config/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// reads REVENUECAT_PUBLIC_KEY and returns it to client
```

```2:153:dripify-dashboard-82/supabase/functions/revenuecat-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// webhook processing event_type and updating Supabase
```

Use these screenshots/citations to annotate debranding tasks and paywall decommission or replacement.

