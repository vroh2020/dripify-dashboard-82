#!/bin/bash

# Clean derived data
echo "Cleaning derived data..."
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# List installed certificates
echo "Listing installed certificates..."
security find-identity -p codesigning -v

# List installed provisioning profiles
echo "Listing installed provisioning profiles..."
ls -la ~/Library/MobileDevice/Provisioning\ Profiles/

# Verify the specific provisioning profile
PROFILE_PATH="/Users/ionic-cloud-team/builds/ramvelpuri2020/dripify-dashboard-82/f7bf040e-6cdb-4e05-91a4-83d448641370.mobileprovision"
if [ -f "$PROFILE_PATH" ]; then
    echo "Verifying provisioning profile..."
    security cms -D -i "$PROFILE_PATH" > /tmp/profile.plist
    echo "Profile contents:"
    cat /tmp/profile.plist
else
    echo "Error: Provisioning profile not found at $PROFILE_PATH"
    exit 1
fi

# Verify keychain setup
echo "Verifying keychain setup..."
security list-keychains -d user
security default-keychain -d user

# Verify time synchronization
echo "Verifying system time..."
date
ntpdate -q time.apple.com

# Clean and rebuild pods
echo "Cleaning and rebuilding pods..."
cd ios/App
pod deintegrate
pod cache clean --all
pod install

echo "Verification complete. Check the output above for any issues." 