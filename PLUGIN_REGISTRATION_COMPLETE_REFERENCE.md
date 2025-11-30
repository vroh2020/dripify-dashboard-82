# BackgroundRemoval Plugin - Complete Registration Reference

This document contains all the files and code related to the BackgroundRemoval plugin registration for debugging Appflow builds.

---

## 1. Capacitor Configuration Files

### A) Main Capacitor Config (TypeScript)
**File:** `capacitor.config.ts`

```typescript
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
    // ⚠️ NOTE: BackgroundRemoval is NOT explicitly listed here
    // It's only in the iOS-specific capacitor.config.json
  }
};

export default config;
```

### B) iOS-Specific Capacitor Config (JSON)
**File:** `ios/App/App/capacitor.config.json`

```json
{
	"appId": "com.genstyle.app",
	"appName": "OutfitGrader AI",
	"webDir": "dist",
	"server": {
		"androidScheme": "https"
	},
	"plugins": {
		"SplashScreen": {
			"launchShowDuration": 2000,
			"launchAutoHide": true,
			"backgroundColor": "#000000",
			"androidSplashResourceName": "splash",
			"androidScaleType": "CENTER_CROP",
			"showSpinner": false,
			"splashFullScreen": true,
			"splashImmersive": true
		},
		"PurchasesPlugin": {
			"apiKey": "",
			"useAmazonSandbox": false,
			"shouldShowInAppMessagesAutomatically": true
		},
		"SignInWithApple": {
			"clientId": "service.com.genstyle.app",
			"scopes": "email name"
		},
		"BackgroundRemoval": {}  // ✅ Plugin registered here
	},
	"packageClassList": [
		"SignInWithApple",
		"InAppReviewPlugin",
		"AppPlugin",
		"CAPBrowserPlugin",
		"CAPCameraPlugin",
		"PreferencesPlugin",
		"SplashScreenPlugin",
		"PurchasesPlugin",
		"BackgroundRemovalPlugin"  // ✅ Native class name registered here
	]
}
```

**Key Points:**
- ✅ `BackgroundRemoval` is in the `plugins` object (empty config `{}`)
- ✅ `BackgroundRemovalPlugin` is in the `packageClassList` array
- This is the iOS-specific config that Appflow uses during builds

---

## 2. Objective-C Plugin Registration (.m file)

**File:** `ios/App/App/BackgroundRemovalPlugin.m`

```objc
#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Import Swift bridging header - required for CAP_PLUGIN macro to find Swift class
// Xcode auto-generates this header from Swift files
#if __has_include("App-Swift.h")
#import "App-Swift.h"
#endif

CAP_PLUGIN(BackgroundRemovalPlugin, "BackgroundRemoval",
    CAP_PLUGIN_METHOD(removeBackground, CAPPluginReturnPromise);
)
```

**Verification:**
- ✅ Plugin name: `"BackgroundRemoval"` (matches JS registration)
- ✅ Class name: `BackgroundRemovalPlugin` (matches Swift class)
- ✅ Method name: `removeBackground` (matches Swift method)
- ✅ Bridging header import: `App-Swift.h` (required for Swift/Obj-C interop)

---

## 3. JavaScript/TypeScript Plugin Registration

**File:** `src/utils/backgroundRemoval.ts`

### Plugin Interface Definition
```typescript
interface BackgroundRemovalPlugin {
  removeBackground(options: { image: string }): Promise<{ 
    imageData?: string; 
    image?: string; 
    success?: boolean; 
    error?: string 
  }>;
}
```

### Plugin Registration
```typescript
// Register the plugin
const BackgroundRemoval = Capacitor.registerPlugin<BackgroundRemovalPlugin>('BackgroundRemoval');
```

### Plugin Usage
```typescript
// Line 74: Where the plugin is actually called
const result = await BackgroundRemoval.removeBackground({ image: imageDataUrl });
```

**Key Points:**
- ✅ Plugin registered with name: `'BackgroundRemoval'` (matches native registration)
- ✅ Method called: `removeBackground({ image: string })`
- ✅ Parameter name: `image` (not `imageData`)

### Full Usage Context
```typescript
export async function removeImageBackground(imageDataUrl: string): Promise<string> {
  const platform = Capacitor.getPlatform();
  
  if (platform === 'ios') {
    // Check plugin availability first
    if (!isPluginAvailable()) {
      console.warn('⚠️ BackgroundRemoval plugin not available - plugin may not be registered');
      return imageDataUrl;
    }
    
    if (!BackgroundRemoval) {
      console.warn('⚠️ BackgroundRemoval plugin instance is null');
      return imageDataUrl;
    }
    
    try {
      console.log('📞 Calling native BackgroundRemoval plugin...');
      const result = await BackgroundRemoval.removeBackground({ image: imageDataUrl });
      console.log('📥 Native plugin responded!');
      
      // Handle response...
      const processedImage = result?.imageData || result?.image;
      // ... rest of processing
    } catch (error) {
      // Error handling...
    }
  }
  
  return imageDataUrl;
}
```

---

## 4. Build Configuration Files

### A) build.xcconfig
**File:** `ios/App/App/build.xcconfig`

```
// Provisioning profile configuration
PROVISIONING_PROFILE_SPECIFIER = "Dripify AI"
DEVELOPMENT_TEAM = TN748MMP9M
CODE_SIGN_IDENTITY = Apple Distribution: Velpuri Enterprises Inc. (TN748MMP9M)
CODE_SIGN_STYLE = Manual

// Bundle identifier should match what's in capacitor.config.ts
PRODUCT_BUNDLE_IDENTIFIER = com.genstyle.app

// Swift compiler settings to fix Xcode 16.4 compatibility issues
SWIFT_SUPPRESS_WARNINGS = YES
SWIFT_TREAT_WARNINGS_AS_ERRORS = NO
SWIFT_VERSION = 5.0
SWIFT_LANGUAGE_VERSION = 5.0

// Disable Swift 6 features that cause type ambiguity
SWIFT_STRICT_CONCURRENCY = complete
SWIFT_OPTIMIZATION_LEVEL = -O
SWIFT_COMPILATION_MODE = wholemodule

// Module settings to avoid type conflicts
DEFINES_MODULE = YES
CLANG_ENABLE_MODULES = YES

// Enable Swift concurrency for Task type support
OTHER_SWIFT_FLAGS = $(inherited) -enable-actor-data-race-checks
GCC_PREPROCESSOR_DEFINITIONS = $(inherited) REVENUECAT_HYBRID=1

// Include build.xcconfig in Xcode project
#include? "Pods/Target Support Files/Pods-App/Pods-App.debug.xcconfig"
#include? "Pods/Target Support Files/Pods-App/Pods-App.release.xcconfig"
```

**Key Points:**
- ✅ Swift version: 5.0 (not 6.0)
- ✅ Module support enabled: `DEFINES_MODULE = YES`
- ✅ Clang modules enabled: `CLANG_ENABLE_MODULES = YES`

### B) Podfile
**File:** `ios/App/Podfile`

```ruby
require_relative '../../node_modules/@capacitor/ios/scripts/pods_helpers'

platform :ios, '17.0'
use_frameworks!

# workaround to avoid Xcode caching of Pods that requires
# Product -> Clean Build Folder after new Cordova plugins installed
# Requires CocoaPods 1.6 or newer
install! 'cocoapods', :disable_input_output_paths => true

def capacitor_pods
  pod 'Capacitor', :path => '../../node_modules/@capacitor/ios'
  pod 'CapacitorCordova', :path => '../../node_modules/@capacitor/ios'
  pod 'CapacitorCommunityAppleSignIn', :path => '../../node_modules/@capacitor-community/apple-sign-in'
  pod 'CapacitorCommunityInAppReview', :path => '../../node_modules/@capacitor-community/in-app-review'
  pod 'CapacitorApp', :path => '../../node_modules/@capacitor/app'
  pod 'CapacitorBrowser', :path => '../../node_modules/@capacitor/browser'
  pod 'CapacitorCamera', :path => '../../node_modules/@capacitor/camera'
  pod 'CapacitorPreferences', :path => '../../node_modules/@capacitor/preferences'
  pod 'CapacitorSplashScreen', :path => '../../node_modules/@capacitor/splash-screen'
  pod 'RevenuecatPurchasesCapacitor', :path => '../../node_modules/@revenuecat/purchases-capacitor'
end

target 'App' do
  capacitor_pods
  # Add your Pods here
end

post_install do |installer|
  assertDeploymentTarget(installer)
  
  # Fix for Xcode 16.4 Swift 6 compatibility issues
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      # Force Swift 5 language mode to avoid Swift 6 compatibility issues
      config.build_settings['SWIFT_LANGUAGE_VERSION'] = '5.0'
      config.build_settings['SWIFT_SUPPRESS_WARNINGS'] = 'YES'
      config.build_settings['SWIFT_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
      
      # ... RevenueCat specific settings ...
      
      # General module settings
      config.build_settings['DEFINES_MODULE'] = 'YES'
      config.build_settings['CLANG_ENABLE_MODULES'] = 'YES'
    end
  end
end
```

**Key Points:**
- ✅ iOS deployment target: 17.0
- ✅ Swift version forced to 5.0 in post_install
- ✅ Module support enabled for all pods

---

## 5. Swift Plugin Implementation (Key Parts)

**File:** `ios/App/App/BackgroundRemovalPlugin.swift`

### Plugin Registration (CAPBridgedPlugin)
```swift
@objc(BackgroundRemovalPlugin)
public class BackgroundRemovalPlugin: CAPPlugin, CAPBridgedPlugin {
    // REQUIRED for Capacitor 6+/7+ - tells Capacitor how to find this plugin
    // Both identifier and jsName should match the JavaScript registration name
    public let identifier = "BackgroundRemoval"
    public let jsName = "BackgroundRemoval"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "removeBackground", returnType: CAPPluginReturnPromise)
    ]
    
    public override func load() {
        super.load()
        CAPLog.print("✅ BackgroundRemovalPlugin loaded and registered successfully")
        CAPLog.print("📦 Plugin jsName: \(jsName)")
        CAPLog.print("📦 Plugin identifier: \(identifier)")
    }
    
    // Method implementation
    @objc public func removeBackground(_ call: CAPPluginCall) {
        // ... implementation
    }
}
```

**Key Points:**
- ✅ Class name: `BackgroundRemovalPlugin` (matches .m file)
- ✅ `@objc(BackgroundRemovalPlugin)` - exposes to Objective-C
- ✅ `identifier = "BackgroundRemoval"` (matches JS registration)
- ✅ `jsName = "BackgroundRemoval"` (matches JS registration)
- ✅ Method name: `removeBackground` (matches JS call)

---

## 6. Appflow-Specific Build Scripts

### A) Fastfile
**File:** `fastlane/Fastfile`

```ruby
default_platform(:ios)

platform :ios do
  desc "Build and deploy the iOS app"
  lane :build_and_deploy do
    # Update code signing settings
    update_code_signing_settings(
      use_automatic_signing: false,
      path: "./ios/App/App.xcodeproj",
      team_id: "TN748MMP9M",
      targets: ["App"],
      build_configurations: ["Debug", "Release"],
      code_sign_identity: "Apple Distribution: Velpuri Enterprises Inc. (TN748MMP9M)",
      profile_name: "Dripify AI",
      bundle_identifier: "com.genstyle.app"
    )
    
    # Build the app
    build_ios_app(
      workspace: "./ios/App/App.xcworkspace",
      scheme: "App",
      export_method: "app-store",
      export_options: {
        method: "app-store",
        provisioningProfiles: {
          "com.genstyle.app" => "Dripify AI"
        },
        signingStyle: "manual",
        teamID: "TN748MMP9M"
      }
    )
    
    # Upload to App Store Connect
    upload_to_app_store(
      skip_screenshots: true,
      skip_metadata: true
    )
  end
end
```

### B) Build Script
**File:** `ios/build_script.sh`

```bash
#!/bin/bash

# Exit on error
set -e

echo "Installing Ruby dependencies..."
bundle install --path vendor/bundle

echo "Installing npm dependencies..."
rm -f package-lock.json
npm install

echo "Installing Capacitor dependencies..."
npx cap sync ios

echo "Installing CocoaPods dependencies..."
cd ios/App
bundle exec pod install
cd ../..

echo "Building iOS app..."
bundle exec fastlane ios build_capacitor
```

---

## 7. Critical Files for Appflow

### A) Dummy.swift (Forces Swift Compilation)
**File:** `ios/App/App/Dummy.swift`

```swift
import Foundation
// Empty file - just triggers Swift compilation in Appflow builds
// Without this, App-Swift.h bridging header won't be generated
// Without the bridging header, BackgroundRemovalPlugin.m can't find the Swift class
```

**Why it's needed:**
- Xcode only generates `App-Swift.h` when it compiles Swift files
- Without any Swift files, the bridging header doesn't exist
- `CAP_PLUGIN` macro in `.m` file can't find the Swift class
- Capacitor falls back to "plugin not implemented"

### B) AppDelegate.swift
**File:** `ios/App/App/AppDelegate.swift`

```swift
import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        // Note: BackgroundRemovalPlugin is auto-registered via CAP_PLUGIN macro in BackgroundRemovalPlugin.m
        return true
    }
    
    // ... other methods ...
}
```

---

## 8. Plugin Name Consistency Check

| Location | Value | Status |
|----------|-------|--------|
| **JS Registration** | `'BackgroundRemoval'` | ✅ |
| **Swift identifier** | `"BackgroundRemoval"` | ✅ |
| **Swift jsName** | `"BackgroundRemoval"` | ✅ |
| **.m file CAP_PLUGIN** | `"BackgroundRemoval"` | ✅ |
| **capacitor.config.json plugins** | `"BackgroundRemoval"` | ✅ |
| **capacitor.config.json packageClassList** | `"BackgroundRemovalPlugin"` | ✅ |
| **Swift class name** | `BackgroundRemovalPlugin` | ✅ |
| **.m file class reference** | `BackgroundRemovalPlugin` | ✅ |
| **Method name (JS)** | `removeBackground` | ✅ |
| **Method name (Swift)** | `removeBackground` | ✅ |
| **Method name (.m)** | `removeBackground` | ✅ |

**✅ All names are consistent!**

---

## 9. What to Check in Appflow Build Logs

When reviewing Appflow build logs, look for:

### ✅ Success Indicators:
1. **Swift Compilation:**
   ```
   Compiling Swift source files...
   BackgroundRemovalPlugin.swift
   Dummy.swift
   ```

2. **Bridging Header Generation:**
   ```
   Generating App-Swift.h...
   ```

3. **Objective-C Compilation:**
   ```
   Compiling BackgroundRemovalPlugin.m...
   ```

4. **Plugin Registration:**
   ```
   ✅ BackgroundRemovalPlugin loaded and registered successfully
   📦 Plugin jsName: BackgroundRemoval
   📦 Plugin identifier: BackgroundRemoval
   ```

### ❌ Error Indicators:
1. **Missing Bridging Header:**
   ```
   'App-Swift.h' file not found
   ```

2. **Swift Compilation Errors:**
   ```
   error: cannot find type 'BackgroundRemovalPlugin' in scope
   ```

3. **Plugin Not Found:**
   ```
   "BackgroundRemoval" plugin is not implemented on iOS
   ```

---

## 10. Quick Verification Checklist

- [x] `capacitor.config.json` has `"BackgroundRemoval": {}` in plugins
- [x] `capacitor.config.json` has `"BackgroundRemovalPlugin"` in packageClassList
- [x] `BackgroundRemovalPlugin.m` uses `CAP_PLUGIN(BackgroundRemovalPlugin, "BackgroundRemoval", ...)`
- [x] `BackgroundRemovalPlugin.m` imports `App-Swift.h`
- [x] `BackgroundRemovalPlugin.swift` has `identifier = "BackgroundRemoval"`
- [x] `BackgroundRemovalPlugin.swift` has `jsName = "BackgroundRemoval"`
- [x] `BackgroundRemovalPlugin.swift` implements `CAPBridgedPlugin`
- [x] `Dummy.swift` exists to force Swift compilation
- [x] JS code uses `Capacitor.registerPlugin('BackgroundRemoval')`
- [x] JS code calls `BackgroundRemoval.removeBackground({ image: ... })`
- [x] All plugin names match exactly (case-sensitive)

---

## 11. Common Issues & Solutions

### Issue: "Plugin not implemented" in Appflow
**Solution:**
1. Ensure `Dummy.swift` exists
2. Check build logs for Swift compilation
3. Verify `App-Swift.h` is generated
4. Use **Clean Build** on Appflow (no cache)

### Issue: Plugin loads but method fails
**Solution:**
1. Check method name matches: `removeBackground`
2. Verify parameter name: `image` (not `imageData`)
3. Check Swift method signature: `@objc public func removeBackground(_ call: CAPPluginCall)`

### Issue: Swift compilation errors
**Solution:**
1. Check `build.xcconfig` has `SWIFT_VERSION = 5.0`
2. Verify `Podfile` post_install sets Swift 5.0
3. Check for type conflicts in Swift code

---

## Summary

All plugin registration files are correctly configured:
- ✅ Plugin name is consistent: `"BackgroundRemoval"`
- ✅ Class name is consistent: `BackgroundRemovalPlugin`
- ✅ Method name is consistent: `removeBackground`
- ✅ Registration files are in place
- ✅ Bridging header setup is correct
- ✅ Appflow-specific fixes are applied

**Next Step:** Review Appflow build logs for Swift compilation and bridging header generation.

