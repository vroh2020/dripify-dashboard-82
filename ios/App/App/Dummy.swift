//
// Dummy.swift
// App
//
// PURPOSE: Forces Xcode/Appflow to compile Swift code
//
// When building on Appflow (cloud builds), this file ensures that:
// 1. Swift compilation is triggered
// 2. App-Swift.h bridging header is generated
// 3. Swift classes are exposed to Objective-C at runtime
//
// NOTE: BackgroundRemovalPlugin.m does NOT import App-Swift.h
// (importing it causes "duplicate interface definition" errors)
// The CAP_PLUGIN macro only registers the plugin name.
// The actual plugin registration happens via CAPBridgedPlugin protocol in Swift.
//

import Foundation

// This class exists only to ensure Swift compilation happens
// Without at least one Swift file, Xcode won't generate App-Swift.h
@objc class DummySwiftClass: NSObject {
    @objc static func initialize() {
        // No-op - just ensures this class is included in the build
    }
}
