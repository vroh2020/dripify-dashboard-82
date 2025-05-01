#!/usr/bin/env bash
set -e

echo "🚀 Starting build process..."

# Install Ruby dependencies
echo "📦 Installing Ruby dependencies..."
bundle install

# Clean npm cache and install dependencies
echo "🧹 Cleaning npm cache and installing dependencies..."
rm -f package-lock.json
npm cache clean --force
npm install

# Build the app
echo "🏗️ Building the app..."
npm run build

# Sync Capacitor
echo "🔄 Syncing Capacitor..."
npx cap sync ios

echo "✅ Build process completed successfully!" 