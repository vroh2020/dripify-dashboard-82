@echo off
echo 🧹 Cleaning iOS build artifacts...

cd ios\App

echo 📦 Cleaning CocoaPods...
if exist Pods rmdir /s /q Pods
if exist Podfile.lock del Podfile.lock

echo 🏗️ Cleaning Xcode build...
xcodebuild clean -workspace App.xcworkspace -scheme App

echo 📦 Reinstalling CocoaPods...
pod install

echo ✅ iOS project cleaned and rebuilt successfully!
echo You can now run: npx cap sync ios

cd ..\..
