
# iOS Build Instructions for RevenueCat Integration

## Build Environment
- Required: macOS with Xcode 14+
- Capacitor: 7.1.0
- RevenueCat Plugin: @revenuecat/purchases-capacitor@7.5.0

## Issue
There's a dependency conflict between Capacitor and RevenueCat:
- RevenueCat plugin expects `@capacitor/core@^5.0.0`
- Our project uses `@capacitor/core@7.1.0`
- This causes an `ERESOLVE` npm error during build

## Solution Options

### Option 1: Override Peer Dependencies (Recommended)
Run:
```bash
npm install --legacy-peer-deps
npx cap sync
```

For CI/CD pipelines, modify the install step:
```bash
npm ci || npm install --legacy-peer-deps
```

Alternatively, add this to package.json:
```json
"overrides": {
  "@revenuecat/purchases-capacitor": {
    "@capacitor/core": "^7.1.0"
  }
}
```

### Option 2: Downgrade Capacitor
If Option 1 doesn't work, you can downgrade to Capacitor v5:
```bash
npm uninstall @capacitor/core @capacitor/ios @capacitor/android @capacitor/cli
npm install @capacitor/core@5.5.0 @capacitor/ios@5.5.0 @capacitor/android@5.5.0 @capacitor/cli@5.5.0
npx cap sync
```

## Local Build Instructions

1. Clone the repository
2. Install dependencies with the override flag:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Build the web app:
   ```bash
   npm run build
   ```
4. Sync the Capacitor project:
   ```bash
   npx cap sync
   ```
5. Open the iOS project:
   ```bash
   npx cap open ios
   ```
6. In Xcode, ensure signing is configured with your Apple Developer account
7. Build and run on a simulator or device

## RevenueCat Testing in Sandbox

1. Run the app on a device or simulator
2. Create a sandbox test account in App Store Connect:
   - Go to [App Store Connect](https://appstoreconnect.apple.com/) > Users and Access > Sandbox > Testers
   - Add a new sandbox tester with a unique email
3. On your iOS device/simulator:
   - Sign out of your regular Apple ID (Settings > App Store)
   - When prompted in our app, sign in with your sandbox tester account
4. Test purchases will not charge real money in sandbox mode
5. Subscriptions in sandbox mode have accelerated renewal periods for testing

## Troubleshooting

- **Build Errors**: Try cleaning the project in Xcode (Product > Clean Build Folder)
- **Linking Errors**: Make sure all dependencies are properly linked (check Pods)
- **RevenueCat Not Working**: Verify API keys are correctly set in `capacitor.config.ts`
- **Purchase Failures**: Ensure sandbox tester is properly set up and signed in

## Important Configuration Files

- `capacitor.config.ts`: Contains RevenueCat plugin configuration
- `ios/App/Podfile`: Contains iOS dependencies
- `ios/App/App/Info.plist`: Contains app permissions and configuration

