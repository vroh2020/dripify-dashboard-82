#!/bin/bash

# Exit on error
set -e

echo "Installing Ruby dependencies..."
bundle install --path vendor/bundle

echo "Installing npm dependencies..."
rm -f package-lock.json
npm install

echo "Installing Capacitor dependencies..."
npx cap sync ios

echo "Installing CocoaPods dependencies..."
cd ios/App
bundle exec pod install
cd ../..

echo "Building iOS app..."
bundle exec fastlane ios build_capacitor 