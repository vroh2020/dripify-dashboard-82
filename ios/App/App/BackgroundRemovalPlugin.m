#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Import the Swift bridging header to expose Swift class to Obj-C
#if __has_include("App-Swift.h")
#import "App-Swift.h"
#endif

CAP_PLUGIN(BackgroundRemovalPlugin, "BackgroundRemoval",
    CAP_PLUGIN_METHOD(removeBackground, CAPPluginReturnPromise);
)
