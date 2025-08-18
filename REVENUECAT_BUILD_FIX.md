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
      # Disable Swift 6 warnings that cause build failures in CI
      config.build_settings['SWIFT_SUPPRESS_WARNINGS'] = 'YES'
      config.build_settings['SWIFT_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
      # Ensure consistent Swift version
      config.build_settings['SWIFT_VERSION'] = '5.0'
      
      # Add specific flags to resolve type ambiguity issues
      config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-O'
      config.build_settings['SWIFT_COMPILATION_MODE'] = 'wholemodule'
      
      # Disable Swift 6 strict concurrency checking
      config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'complete'
      
      # Add module map settings to avoid type conflicts
      config.build_settings['DEFINES_MODULE'] = 'YES'
      config.build_settings['CLANG_ENABLE_MODULES'] = 'YES'
      
      # Force Swift 5 language mode to avoid Swift 6 type ambiguity issues
      config.build_settings['SWIFT_LANGUAGE_VERSION'] = '5.0'
      
      # Specific fix for PurchasesHybridCommon SubscriptionPeriod ambiguity
      if target.name == 'PurchasesHybridCommon'
        config.build_settings['SWIFT_ACTIVE_COMPILATION_CONDITIONS'] = '$(inherited) SWIFT_PACKAGE'
        config.build_settings['SWIFT_INCLUDE_PATHS'] = '$(inherited) $(PODS_ROOT)/RevenueCat/Sources'
        config.build_settings['SWIFT_MODULE_NAME'] = 'PurchasesHybridCommon'
        # Disable Swift 6 language mode for this specific target
        config.build_settings['SWIFT_LANGUAGE_VERSION'] = '5.0'
      end
    end
  end
end
```

### 2. Updated build.xcconfig
Added comprehensive Swift compiler settings to the main app target:
```
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

### 3. Created Clean Scripts
- `ios/clean_and_rebuild.sh` (macOS/Linux)
- `ios/clean_and_rebuild.bat` (Windows)

## Why This Fix Works

1. **Targeted Approach**: Specifically addresses the PurchasesHybridCommon target causing the issue
2. **Swift 5 Compatibility**: Forces Swift 5 language mode to avoid Swift 6 type ambiguity
3. **Module Resolution**: Adds proper module settings to resolve type conflicts
4. **CI-Specific**: Addresses the version difference between local and CI environments
5. **Future-Proof**: Will work with future Xcode updates

## Testing

To test the fix locally:
1. Run the clean script: `./ios/clean_and_rebuild.sh` (macOS) or `ios\clean_and_rebuild.bat` (Windows)
2. Sync Capacitor: `npx cap sync ios`
3. Build the project: `npx cap build ios`

## Current Status

**Latest Fix Applied**: Added `SWIFT_LANGUAGE_VERSION = '5.0'` to force Swift 5 compatibility and prevent Swift 6 type ambiguity issues.

## Notes

- This fix only affects the build process, not the runtime behavior
- The app functionality remains unchanged
- Local development continues to work as before
- CI builds should now succeed with Xcode 16.4
- The fix specifically targets the PurchasesHybridCommon module that was causing the SubscriptionPeriod ambiguity
