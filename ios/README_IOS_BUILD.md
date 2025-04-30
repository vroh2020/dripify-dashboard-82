
# iOS Build Instructions

## Build Environment Requirements
- macOS (latest stable version recommended)
- Xcode (latest stable version recommended)
- Node.js (LTS version)
- NPM or Yarn

## Provisioning Profile Setup
The app is configured to use the following settings:
- Bundle ID: `com.genstyle.app`
- Team ID: `TN748MMP9M`
- Provisioning Profile: `Gen Style`

## Local Development Build

1. Make sure you have the latest dependencies:
```
npm install
```

2. Sync the Capacitor project:
```
npx cap sync ios
```

3. Configure signing in Xcode:
   - Open the project in Xcode: `npx cap open ios`
   - Select the project in the Navigator
   - Select the "App" target
   - Go to "Signing & Capabilities"
   - Ensure "Automatically manage signing" is enabled (or disabled if using manual profiles)
   - Select your team and provisioning profile

4. Run the build:
   - Select your device or simulator
   - Click the Play button or press Cmd+R

## CI/CD Build

For CI/CD environments, ensure the following:

1. The provisioning profile and certificate are properly installed in the build environment
2. The `build.xcconfig` file is included in the project
3. The build script includes these steps:
```
npm install
npx cap sync ios
node ios/App/update-build-config.js  # Optional, if needed
cd ios/App && xcodebuild -workspace App.xcworkspace -scheme App -configuration Release archive -archivePath ./Build/App.xcarchive CODE_SIGN_IDENTITY="Apple Distribution: Rohini Mallavarapu (TN748MMP9M)" PROVISIONING_PROFILE_SPECIFIER="Gen Style" DEVELOPMENT_TEAM=TN748MMP9M
```

## Troubleshooting

### Common Issues:

#### Provisioning Profile Mismatch
Error: "No provisioning profile found matching 'Gen Style'"

Solution: 
- Verify that the provisioning profile exists in your Apple Developer account
- Download and install the profile on your build machine
- Make sure the bundle ID in Xcode matches `com.genstyle.app`

#### Code Signing Identity Not Found
Error: "No code signing identities found"

Solution:
- Install the required certificates on your build machine
- Verify that the development team ID is correct (TN748MMP9M)
- Check if the certificate has expired and needs renewal

#### Build Configuration Issues
If you're experiencing build configuration issues, you may need to manually set the build settings in Xcode:

1. Open Xcode and your project
2. Select the project in the Navigator
3. Select the "App" target
4. Go to "Build Settings"
5. Search for "Code Signing"
6. Manually set the "Development Team," "Provisioning Profile," and "Code Signing Identity"

## Additional Resources
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Xcode Code Signing Guide](https://developer.apple.com/documentation/xcode/signing-a-mac-app)
