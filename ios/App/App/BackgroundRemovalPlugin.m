//
//  BackgroundRemovalPlugin.m
//  App
//
//  Capacitor plugin registration file for BackgroundRemovalPlugin
//  DO NOT import App-Swift.h here - it causes duplicate interface errors
//  The Swift class uses @objc(BackgroundRemovalPlugin) which already exposes to Obj-C
//

#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// NOTE: Do NOT import App-Swift.h here!
// The CAP_PLUGIN macro only registers the plugin name with Capacitor.
// Importing the Swift bridging header causes "duplicate interface definition" errors
// because:
//   1. App-Swift.h declares @interface BackgroundRemovalPlugin (from Swift @objc attribute)
//   2. CAP_PLUGIN macro also works with the class interface
//   3. This creates a conflict during compilation
//
// The Swift plugin class implements CAPBridgedPlugin protocol which handles
// the actual plugin registration at runtime.

CAP_PLUGIN(BackgroundRemovalPlugin, "BackgroundRemoval",
    CAP_PLUGIN_METHOD(removeBackground, CAPPluginReturnPromise);
)
