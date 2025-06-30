
# iOS Build Instructions for Gen Style App

## Prerequisites
- macOS (latest stable version recommended)
- Xcode (latest version, currently works with Xcode 16.1)
- Node.js (LTS version)
- NPM or Yarn
- Apple Developer account with distribution certificates

## Important Configuration Files
- **build.xcconfig**: Contains essential code signing settings
- **exportOptions.plist**: Configures the app export process
- **capacitor.config.ts**: Defines app ID, name, and other Capacitor settings
- **.gitlab-ci.yml**: CI/CD pipeline configuration

## Local Development Build

1. **Installation**:
```bash
npm install
npx cap sync ios
cd ios/App && pod install && cd ../..
```

2. **Ensure Build Configuration**:
```bash
node ios/App/update-build-config.js
```

3. **Configure Code Signing in Xcode**:
   - Open the project: `npx cap open ios`
   - Select the App project in Navigator
   - Go to "Signing & Capabilities" tab
   - Ensure "Automatically manage signing" is **unchecked**
   - Select team: "TN748MMP9M"
   - Set Provisioning Profile: "Gen Style"
   - Set Bundle Identifier: "com.genstyle.app"

4. **Verify build.xcconfig Integration**:
   - In Xcode, select the project in Navigator
   - Go to "Build Settings" tab
   - Search for "config file"
   - Ensure "Configuration File" is set to "App/build.xcconfig"

5. **Build the App**:
   - Select your device or simulator
   - Build using Cmd+B or the Play button

## CI/CD Build Process

The GitLab CI pipeline is configured to:

1. **Prepare Stage**:
   - Set up build environment
   - Install certificates and provisioning profiles
   - Configure code signing

2. **Build Stage**:
   - Apply build.xcconfig settings
   - Clean and archive the project
   - Export IPA using the exportOptions.plist

3. **Deploy Stage**:
   - Upload the IPA to App Store Connect

## Manual Build from Terminal

To build the app manually from terminal:

```bash
cd ios/App
xcodebuild clean -workspace App.xcworkspace -scheme App
xcodebuild archive -workspace App.xcworkspace -scheme App \
  -configuration Release \
  -archivePath build/App.xcarchive \
  DEVELOPMENT_TEAM=TN748MMP9M \
  PROVISIONING_PROFILE_SPECIFIER="Gen Style" \
  CODE_SIGN_IDENTITY="Apple Distribution: Velpuri Enterprises Inc. (TN748MMP9M)" \
  CODE_SIGN_STYLE=Manual
xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportOptionsPlist ../../exportOptions.plist \
  -exportPath build
```

## Troubleshooting

### Provisioning Profile Not Found
- Ensure profile "Gen Style" exists in your Apple Developer account
- Download and install it on your local machine in Xcode Accounts
- Check the bundle ID matches "com.genstyle.app"
- Verify the profile is not expired

### Code Signing Failures
- Run `security find-identity -v -p codesigning` to list available certificates
- Ensure certificate "Apple Distribution: Velpuri Enterprises Inc. (TN748MMP9M)" is installed
- Check keychain access for any permission issues

### Configuration File Not Applied
- Manually edit the Xcode project settings to include build.xcconfig
- Run `node ios/App/update-build-config.js` to ensure settings are applied
- Check the build.xcconfig file content is correct

### CI/CD Pipeline Issues
- Review the GitLab CI logs for specific errors
- Ensure all environment variables are properly set
- Verify the provisioning profile and certificate are correctly uploaded to CI

## Contact

For assistance with iOS build issues, contact the mobile development team.
