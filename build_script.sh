#!/bin/bash
set -e

echo "Starting build process..."

# Install dependencies
echo "Installing npm dependencies..."
npm install

# Build the app
echo "Building the app..."
npm run build

# Sync Capacitor
echo "Syncing Capacitor..."
npx cap sync ios

# Install RevenueCat if not already installed
if ! grep -q "RevenueCat" ios/App/Podfile; then
    echo "Adding RevenueCat to Podfile..."
    echo "pod 'RevenueCat', '~> 4.0'" >> ios/App/Podfile
fi

# Install pods
echo "Installing pods..."
cd ios/App
pod install
cd ../..

echo "Build process completed successfully!" 