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
The build is still failing with the same error. The issue persists because:

1. **Type Ambiguity**: The `SubscriptionPeriod` type is defined in multiple RevenueCat modules
2. **Swift 6 Compatibility**: Xcode 16.4 has stricter type checking
3. **Module Resolution**: The compiler can't determine which `SubscriptionPeriod` to use

## Next Steps
If this fix doesn't work, we may need to:
1. Update to a newer version of RevenueCat Capacitor plugin
2. Apply a direct patch to the problematic Swift file
3. Use a different approach to resolve the type ambiguity

## Build Environment
- **Build Stack**: macOS - 2025.06 - Apple silicon
- **Xcode Version**: 16.4 (Build version 16F6)
- **Swift Version**: 6.0 compatibility checks
- **RevenueCat Version**: @revenuecat/purchases-capacitor@8.0.0
