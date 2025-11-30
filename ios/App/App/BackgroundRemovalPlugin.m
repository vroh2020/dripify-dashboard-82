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
