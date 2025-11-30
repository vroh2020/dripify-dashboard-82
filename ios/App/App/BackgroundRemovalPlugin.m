#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Import the auto-generated Swift bridging header
// This is REQUIRED for Capacitor to find the Swift plugin class
#if __has_include("App-Swift.h")
#import "App-Swift.h"
#elif __has_include(<App/App-Swift.h>)
#import <App/App-Swift.h>
#endif

CAP_PLUGIN(BackgroundRemovalPlugin, "BackgroundRemoval",
    CAP_PLUGIN_METHOD(removeBackground, CAPPluginReturnPromise);
)
