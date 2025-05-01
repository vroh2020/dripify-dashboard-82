#!/usr/bin/env bash
set -e

echo "🚀 Starting build process..."

# Install Ruby dependencies
echo "📦 Installing Ruby dependencies..."
bundle install --path vendor/bundle

# Clean npm cache and install dependencies
echo "🧹 Cleaning npm cache and installing dependencies..."
rm -f package-lock.json
npm cache clean --force
npm install --legacy-peer-deps

# Build the app
echo "🏗️ Building the app..."
npm run build

# Sync Capacitor
echo "🔄 Syncing Capacitor..."
npx cap sync ios

# Install CocoaPods
echo "📱 Installing CocoaPods..."
cd ios/App
bundle exec pod install --repo-update || {
    echo "❌ CocoaPods installation failed. Retrying with clean install..."
    bundle exec pod deintegrate
    bundle exec pod cache clean --all
    bundle exec pod install --repo-update
}
cd ../..

echo "✅ Build process completed successfully!" 