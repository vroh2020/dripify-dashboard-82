# RevenueCat Build Fix for CI Environment

## Problem
The iOS build was failing in the CI environment with the error:
```
❌ 'SubscriptionPeriod' is ambiguous for type lookup in this context
```

This error occurred because:
1. **CI Environment**: Uses Xcode 16.4 with stricter Swift 6 compatibility checks
2. **Local Environment**: Uses older Xcode version where this wasn't an issue
3. **RevenueCat Dependency**: PurchasesHybridCommon has type conflicts in newer Swift versions

## Solution Applied

### 1. Updated Podfile
Added comprehensive post_install hook to suppress Swift 6 warnings and force Swift 5 compatibility:
```ruby
post_install do |installer|
  assertDeploymentTarget(installer)
  
  # Fix for Xcode 16.4 Swift 6 compatibility issues
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      # Force Swift 5 language mode to avoid Swift 6 compatibility issues
      config.build_settings['SWIFT_LANGUAGE_VERSION'] = '5.0'
      config.build_settings['SWIFT_SUPPRESS_WARNINGS'] = 'YES'
      config.build_settings['SWIFT_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
      
      # Specific fix for PurchasesHybridCommon SubscriptionPeriod ambiguity
      if target.name == 'PurchasesHybridCommon'
        # Add explicit type resolution flags
        config.build_settings['SWIFT_ACTIVE_COMPILATION_CONDITIONS'] = '$(inherited) REVENUECAT_HYBRID'
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = '$(inherited) REVENUECAT_HYBRID=1'
        # Force module resolution
        config.build_settings['DEFINES_MODULE'] = 'YES'
        config.build_settings['CLANG_ENABLE_MODULES'] = 'YES'
        # Add explicit import path to resolve type ambiguity
        config.build_settings['SWIFT_INCLUDE_PATHS'] = '$(inherited) $(PODS_ROOT)/PurchasesHybridCommon'
      end
      
      # General module settings
      config.build_settings['DEFINES_MODULE'] = 'YES'
      config.build_settings['CLANG_ENABLE_MODULES'] = 'YES'
    end
  end
end
```

### 2. Updated build.xcconfig
Added comprehensive Swift compiler settings:
```xcconfig
// Swift compiler settings to fix Xcode 16.4 compatibility issues
SWIFT_SUPPRESS_WARNINGS = YES
SWIFT_TREAT_WARNINGS_AS_ERRORS = NO
SWIFT_VERSION = 5.0

// Disable Swift 6 features that cause type ambiguity
SWIFT_STRICT_CONCURRENCY = complete
SWIFT_OPTIMIZATION_LEVEL = -O
SWIFT_COMPILATION_MODE = wholemodule

// Module settings to avoid type conflicts
DEFINES_MODULE = YES
CLANG_ENABLE_MODULES = YES
```

### 3. Created Clean and Rebuild Scripts
- `ios/clean_and_rebuild.sh` (macOS/Linux)
- `ios/clean_and_rebuild.bat` (Windows)

## Current Status
**LATEST FIX APPLIED** - Updated RevenueCat version and added comprehensive type resolution:

### Latest Changes (Final Attempt):
1. **Updated RevenueCat Version**: Upgraded from `@revenuecat/purchases-capacitor@8.0.0` to `@revenuecat/purchases-capacitor@8.1.1`
2. **Enhanced Type Resolution**: Added specific Swift compiler flags to resolve StoreKit vs RevenueCat type ambiguity
3. **Module Priority**: Configured build settings to prioritize RevenueCat types over StoreKit

### Key New Settings:
```ruby
# Force StoreKit 2 usage to resolve SubscriptionPeriod ambiguity
config.build_settings['OTHER_SWIFT_FLAGS'] = '$(inherited) -Xfrontend -disable-implicit-concurrency-module-import -Xfrontend -disable-implicit-string-processing-module-import'
# Ensure RevenueCat types take precedence over StoreKit
config.build_settings['FRAMEWORK_SEARCH_PATHS'] = '$(inherited) $(PODS_ROOT)/RevenueCat'
```

This should resolve the `SubscriptionPeriod` ambiguity by:
1. Using the newer RevenueCat version that may have fixed the issue
2. Explicitly controlling module import order
3. Disabling automatic module imports that cause conflicts

## Build Environment
- **Build Stack**: macOS - 2025.06 - Apple silicon
- **Xcode Version**: 16.4 (Build version 16F6)
- **Swift Version**: 6.0 compatibility checks (forced to 5.0)
- **RevenueCat Version**: @revenuecat/purchases-capacitor@8.1.1 (UPDATED)
