#!/bin/bash

echo "🧹 Cleaning iOS build artifacts..."
cd ios/App

# Clean CocoaPods
echo "📦 Cleaning CocoaPods..."
rm -rf Pods
rm -rf Podfile.lock

# Clean Xcode build
echo "🏗️ Cleaning Xcode build..."
xcodebuild clean -workspace App.xcworkspace -scheme App

# Reinstall pods
echo "📦 Reinstalling CocoaPods..."
pod install

echo "✅ iOS project cleaned and rebuilt successfully!"
echo "You can now run: npx cap sync ios"
