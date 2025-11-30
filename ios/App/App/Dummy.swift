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
// NOTE: Do NOT add initialize() - it's deprecated/forbidden in Swift 5+
//

import Foundation

// Minimal dummy class to force Swift compilation and App-Swift.h generation
// Empty class - exists only to trigger Swift bridging header generation
@objc class DummySwiftClass: NSObject {
    // No methods needed - just the class declaration is enough
}
