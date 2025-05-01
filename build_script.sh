#!/bin/bash
set -e

echo "Starting build process..."

# Install Ruby dependencies
echo "Installing Ruby dependencies..."
bundle install --path vendor/bundle --retry 3

# Clean npm cache and install dependencies
echo "Cleaning npm cache and installing dependencies..."
rm -f package-lock.json
npm cache clean --force
npm install --legacy-peer-deps

# Build the app
echo "Building the app..."
npm run build

# Sync Capacitor for iOS
echo "Syncing Capacitor for iOS..."
npx cap sync ios || {
    echo "First attempt failed, retrying with clean setup..."
    cd ios/App
    pod deintegrate
    pod cache clean --all
    cd ../..
    npx cap sync ios
}

echo "Build process completed successfully!" 